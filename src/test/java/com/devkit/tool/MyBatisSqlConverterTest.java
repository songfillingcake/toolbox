package com.devkit.tool;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MyBatisSqlConverterTest {

  @Test
  void convertsStandardLogBlock() {
    String log = """
        ==> Preparing: SELECT id, name FROM user WHERE id = ? AND status = ?
        ==> Parameters: 1001(Long), active(String)
        """;
    MyBatisSqlConverter.Result result = MyBatisSqlConverter.convertAll(log);
    assertNull(result.error());
    assertEquals(1, result.sqls().size());
    assertEquals(
        "SELECT id, name FROM user WHERE id = 1001 AND status = 'active'",
        result.sqls().get(0));
  }

  @Test
  void handlesNullParameter() {
    String log = """
        ==> Preparing: UPDATE user SET name = ? WHERE id = ?
        ==> Parameters: null, 1(Long)
        """;
    MyBatisSqlConverter.Result result = MyBatisSqlConverter.convertAll(log);
    assertEquals("UPDATE user SET name = NULL WHERE id = 1", result.sqls().get(0));
  }

  @Test
  void escapesSingleQuoteInString() {
    String log = """
        ==> Preparing: SELECT ? AS v
        ==> Parameters: O'Brien(String)
        """;
    MyBatisSqlConverter.Result result = MyBatisSqlConverter.convertAll(log);
    assertEquals("SELECT 'O''Brien' AS v", result.sqls().get(0));
  }

  @Test
  void returnsErrorForEmptyInput() {
    MyBatisSqlConverter.Result result = MyBatisSqlConverter.convertAll("  ");
    assertEquals("请输入 MyBatis 日志", result.error());
    assertTrue(result.sqls().isEmpty());
  }

  @Test
  void returnsErrorForUnrecognizedFormat() {
    MyBatisSqlConverter.Result result = MyBatisSqlConverter.convertAll("random text");
    assertEquals("未识别到 MyBatis 日志格式", result.error());
  }
}
