package com.devkit.web;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

/**
 * 安全 HTTP 拉取：DNS 校验后绑定 IP 建连、禁止重定向、超时、字节上限。
 * <p>注：JDK {@link java.net.HttpURLConnection} 无公开 API 获取对端 IP，故用手动 Socket 建连。</p>
 */
public final class SafeHttpFetcher {

    static final int CONNECT_TIMEOUT_MS = 5_000;
    static final int READ_TIMEOUT_MS = 10_000;
    static final int MAX_BYTES = 512 * 1024;

    private SafeHttpFetcher() {
    }

    public static String fetch(URI uri, boolean allowLocalhost) throws Exception {
        FetchUrlValidator.validate(uri, allowLocalhost);

        String host = uri.getHost();
        boolean https = "https".equalsIgnoreCase(uri.getScheme());
        int port = uri.getPort();
        if (port == -1) {
            port = https ? 443 : 80;
        }

        InetAddress address = FetchUrlValidator.resolveValidatedAddress(host, allowLocalhost);
        String path = buildRequestPath(uri);

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(address, port), CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(READ_TIMEOUT_MS);

            if (socket.getRemoteSocketAddress() instanceof InetSocketAddress remote) {
                FetchUrlValidator.validateResolvedAddress(remote.getAddress(), allowLocalhost);
            }

            InputStream in;
            OutputStream out;
            if (https) {
                SSLSocketFactory sslFactory = (SSLSocketFactory) SSLSocketFactory.getDefault();
                SSLSocket ssl = (SSLSocket) sslFactory.createSocket(socket, host, port, true);
                ssl.setSoTimeout(READ_TIMEOUT_MS);
                ssl.startHandshake();
                in = ssl.getInputStream();
                out = ssl.getOutputStream();
            } else {
                in = socket.getInputStream();
                out = socket.getOutputStream();
            }

            String request = "GET " + path + " HTTP/1.1\r\n"
                    + "Host: " + host + "\r\n"
                    + "User-Agent: DevKit-SafeFetch/" + DevKitVersion.VERSION + "\r\n"
                    + "Connection: close\r\n"
                    + "Accept: */*\r\n"
                    + "\r\n";
            out.write(request.getBytes(StandardCharsets.UTF_8));
            out.flush();

            return readHttpBody(in);
        }
    }

    static String buildRequestPath(URI uri) {
        String path = uri.getRawPath();
        if (path == null || path.isEmpty()) {
            path = "/";
        }
        String query = uri.getRawQuery();
        if (query != null && !query.isEmpty()) {
            path += "?" + query;
        }
        return path;
    }

    static String readHttpBody(InputStream in) throws Exception {
        ByteArrayOutputStream headerBuf = new ByteArrayOutputStream();
        int b;
        int state = 0;
        while ((b = in.read()) != -1) {
            headerBuf.write(b);
            if (state == 0 && b == '\r') state = 1;
            else if (state == 1 && b == '\n') state = 2;
            else if (state == 2 && b == '\r') state = 3;
            else if (state == 3 && b == '\n') break;
            else state = 0;
            if (headerBuf.size() > 64 * 1024) {
                throw new IllegalArgumentException("响应头过大");
            }
        }

        String headers = headerBuf.toString(StandardCharsets.UTF_8);
        String[] lines = headers.split("\r\n");
        if (lines.length == 0) {
            throw new IllegalArgumentException("无效的 HTTP 响应");
        }
        parseStatusLine(lines[0]);

        int contentLength = -1;
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i];
            if (line.isEmpty()) break;
            int colon = line.indexOf(':');
            if (colon <= 0) continue;
            String name = line.substring(0, colon).trim().toLowerCase();
            String value = line.substring(colon + 1).trim();
            if ("content-length".equals(name)) {
                contentLength = Integer.parseInt(value);
            }
        }

        if (contentLength >= 0) {
            return readFixedBody(in, contentLength);
        }
        return readLimited(in);
    }

    static void parseStatusLine(String statusLine) {
        String[] parts = statusLine.split(" ", 3);
        if (parts.length < 2) {
            throw new IllegalArgumentException("无效的 HTTP 状态行");
        }
        int code;
        try {
            code = Integer.parseInt(parts[1]);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("无效的 HTTP 状态码");
        }
        if (code >= 300 && code < 400) {
            throw new IllegalArgumentException("禁止跟随重定向 (HTTP " + code + ")");
        }
        if (code >= 400) {
            throw new IllegalArgumentException("HTTP 错误: " + code);
        }
        if (code < 200 || code >= 300) {
            throw new IllegalArgumentException("不支持的 HTTP 状态: " + code);
        }
    }

    static String readFixedBody(InputStream in, int contentLength) throws Exception {
        if (contentLength > MAX_BYTES) {
            byte[] chunk = in.readNBytes(MAX_BYTES);
            return new String(chunk, StandardCharsets.UTF_8)
                    + "\n\n... (已截断，超过 " + MAX_BYTES + " 字节)";
        }
        byte[] body = in.readNBytes(contentLength);
        return new String(body, StandardCharsets.UTF_8);
    }

    static String readLimited(InputStream in) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int total = 0;
        int n;
        while ((n = in.read(chunk)) != -1) {
            if (total + n > MAX_BYTES) {
                int allowed = MAX_BYTES - total;
                if (allowed > 0) {
                    buf.write(chunk, 0, allowed);
                }
                total = MAX_BYTES + 1;
                break;
            }
            buf.write(chunk, 0, n);
            total += n;
        }
        String content = buf.toString(StandardCharsets.UTF_8);
        if (total > MAX_BYTES) {
            content += "\n\n... (已截断，超过 " + MAX_BYTES + " 字节)";
        }
        return content;
    }
}
