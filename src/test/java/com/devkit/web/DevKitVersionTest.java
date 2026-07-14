package com.devkit.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class DevKitVersionTest {

    @Test
    void versionIsLoaded() {
        assertNotNull(DevKitVersion.VERSION);
        assertFalse(DevKitVersion.VERSION.isBlank());
        assertFalse(DevKitVersion.VERSION.contains("@"));
    }
}
