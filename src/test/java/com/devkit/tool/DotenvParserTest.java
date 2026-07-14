package com.devkit.tool;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DotenvParserTest {

    @Test
    void parsesBasicEnv() {
        DotenvParser.ParseResult r = DotenvParser.parse("""
                DB_HOST=127.0.0.1
                DB_PORT=3306
                export APP_NAME=devkit
                """);
        assertTrue(r.errors().isEmpty());
        assertEquals(3, r.entries().size());
        assertEquals("127.0.0.1", r.entries().get(0).value());
        assertEquals("devkit", r.entries().get(2).value());
    }

    @Test
    void stripsInlineComment() {
        DotenvParser.ParseResult r = DotenvParser.parse("DB_HOST=127.0.0.1 # local mysql");
        assertEquals("127.0.0.1", r.entries().get(0).value());
    }

    @Test
    void parsesQuotedValue() {
        DotenvParser.ParseResult r = DotenvParser.parse("MSG=\"hello\\nworld\"");
        assertEquals("hello\nworld", r.entries().get(0).value());
    }

    @Test
    void skipsCommentLines() {
        DotenvParser.ParseResult r = DotenvParser.parse("# comment\nKEY=val");
        assertEquals(1, r.entries().size());
    }

    @Test
    void reportsInvalidKey() {
        DotenvParser.ParseResult r = DotenvParser.parse("9bad=value");
        assertFalse(r.errors().isEmpty());
    }

    @Test
    void masksSensitiveKeysOnly() {
        List<DotenvParser.Entry> masked = DotenvParser.maskSecrets(List.of(
                new DotenvParser.Entry("DB_USER", "root", 1),
                new DotenvParser.Entry("DB_PASSWORD", "secret", 2),
                new DotenvParser.Entry("API_KEY", "abc", 3),
                new DotenvParser.Entry("MONKEY", "banana", 4)
        ));
        assertEquals("root", masked.get(0).value());
        assertEquals("******", masked.get(1).value());
        assertEquals("******", masked.get(2).value());
        assertEquals("banana", masked.get(3).value());
    }
}
