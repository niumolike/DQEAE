# 安全政策

## 报告漏洞

请**不要**在公开 Issue 中披露安全问题。通过以下方式私下联系维护者：

- GitHub Security Advisories（仓库 Security → Report a vulnerability）；
- 或邮件联系仓库维护者（见 GitHub 主页）。

请在报告中包含：受影响版本、复现步骤、影响范围、可能的修复建议。

## 范围

重点关注：

- API Key 的存储与泄露风险；
- WebView 桥接（文件读取、ZIP 写入、外部链接）的越权；
- 导入 ZIP 的解析漏洞（路径穿越、Zip Bomb、恶意 HTML）；
- 内容安全审核被绕过的路径。

## 不在范围

- 第三方 API（DeepSeek）自身的问题；
- 用户自行 Root / 越狱导致的本地数据泄露；
- 社会工程与物理访问。

## 处理

维护者会尽快确认并修复，修复后在 Release Notes 中致谢（如你愿意）。
