import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  final String? code;
  ApiException(this.status, this.message, [this.code]);
  @override
  String toString() => message;
}

/// Thin JSON client. The token is injected by [Session].
class Api {
  Api._();
  static final Api instance = Api._();

  String? token;
  void Function()? onUnauthorized;

  Uri _uri(String path, [Map<String, dynamic>? q]) {
    final query = <String, String>{};
    q?.forEach((k, v) {
      if (v != null && v.toString().isNotEmpty) query[k] = v.toString();
    });
    return Uri.parse('${AppConfig.apiUrl}$path').replace(queryParameters: query.isEmpty ? null : query);
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> _send(Future<http.Response> Function() fn) async {
    http.Response res;
    try {
      res = await fn().timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw ApiException(0, 'The server is taking too long. Check your internet and try again.');
    } catch (_) {
      throw ApiException(0, 'Cannot reach the server. Check your internet connection.');
    }
    final body = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    if (res.statusCode == 401 && token != null) onUnauthorized?.call();
    final msg = (body is Map && body['error'] != null) ? body['error'].toString() : 'Request failed (${res.statusCode})';
    throw ApiException(res.statusCode, msg, body is Map ? body['code']?.toString() : null);
  }

  Future<dynamic> get(String path, [Map<String, dynamic>? q]) => _send(() => http.get(_uri(path, q), headers: _headers));
  Future<dynamic> post(String path, [Object? body]) => _send(() => http.post(_uri(path), headers: _headers, body: jsonEncode(body ?? {})));
  Future<dynamic> put(String path, [Object? body]) => _send(() => http.put(_uri(path), headers: _headers, body: jsonEncode(body ?? {})));
  Future<dynamic> patch(String path, [Object? body]) => _send(() => http.patch(_uri(path), headers: _headers, body: jsonEncode(body ?? {})));
}
