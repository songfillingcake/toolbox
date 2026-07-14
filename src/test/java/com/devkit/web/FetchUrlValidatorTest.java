package com.devkit.web;

import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FetchUrlValidatorTest {

    @Test
    void blocksPrivateNetwork() {
        assertThrows(IllegalArgumentException.class,
                () -> FetchUrlValidator.validate(URI.create("http://192.168.1.1/api"), false));
        assertThrows(IllegalArgumentException.class,
                () -> FetchUrlValidator.validate(URI.create("http://10.0.0.1/"), false));
    }

    @Test
    void blocksLocalhostByDefault() {
        assertThrows(IllegalArgumentException.class,
                () -> FetchUrlValidator.validate(URI.create("http://localhost:8080/"), false));
    }

    @Test
    void allowsLocalhostWhenConfigured() {
        assertDoesNotThrow(() -> FetchUrlValidator.validate(URI.create("http://127.0.0.1:8088/"), true));
    }

    @Test
    void rejectsNonHttpScheme() {
        assertThrows(IllegalArgumentException.class,
                () -> FetchUrlValidator.validate(URI.create("file:///etc/passwd"), false));
    }

    @Test
    void blocksMetadataHost() {
        assertThrows(IllegalArgumentException.class,
                () -> FetchUrlValidator.validate(URI.create("http://169.254.169.254/latest/meta-data/"), false));
    }
}
