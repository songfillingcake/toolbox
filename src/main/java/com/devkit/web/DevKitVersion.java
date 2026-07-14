package com.devkit.web;

import java.io.InputStream;
import java.util.Properties;

public final class DevKitVersion {

    public static final String VERSION = loadVersion();

    private DevKitVersion() {
    }

    private static String loadVersion() {
        String fallback = "1.10.0";
        try (InputStream in = DevKitVersion.class.getClassLoader().getResourceAsStream("version.properties")) {
            if (in == null) {
                return fallback;
            }
            Properties props = new Properties();
            props.load(in);
            String v = props.getProperty("version");
            return v == null || v.isBlank() || v.contains("@") ? fallback : v.trim();
        } catch (Exception e) {
            return fallback;
        }
    }
}
