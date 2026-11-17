package __PACKAGE__;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * 单文件 WebView 壳：
 * - 用 https://appassets.local 作为安全来源（IndexedDB / fetch 才可用）
 * - 文件选择交给系统 SAF
 * - 导出的 ZIP 通过分块 base64 桥接写到缓存，再让用户「另存为」
 */
public class MainActivity extends Activity {
    private static final int REQ_FILE = 1001;
    private static final int REQ_SAVE = 1002;
    private static final int REQ_PICK_ZIP = 1003;
    private static final String HOST = "appassets.local";
    private static final String IMPORT_CACHE = "import.zip";
    private static final int BG = Color.rgb(14, 16, 20);

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    private String saveName;
    private String saveMime;
    private File saveFile;
    private FileOutputStream saveStream;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);

        webView = new WebView(this);
        webView.setBackgroundColor(BG);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setUserAgentString(settings.getUserAgentString() + " DSMigrate/1.0");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null || !HOST.equals(uri.getHost())) {
                    return null;
                }
                String path = uri.getPath();
                if (path == null || path.isEmpty() || "/".equals(path)) {
                    path = "/index.html";
                }
                if ("/__import.zip".equals(path)) {
                    return serveImportZip();
                }
                String asset = path.substring(1);
                try {
                    InputStream stream = getAssets().open(asset);
                    String mime = mimeOf(asset);
                    return new WebResourceResponse(mime, isText(mime) ? "utf-8" : null, stream);
                } catch (IOException error) {
                    return new WebResourceResponse("text/plain", "utf-8",
                            new ByteArrayInputStream(("404 " + asset).getBytes(StandardCharsets.UTF_8)));
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                    return true;
                } catch (Exception error) {
                    fileCallback = null;
                    return false;
                }
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("好", (dialog, which) -> result.confirm())
                        .setOnCancelListener(dialog -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("确定", (dialog, which) -> result.confirm())
                        .setNegativeButton("取消", (dialog, which) -> result.cancel())
                        .setOnCancelListener(dialog -> result.cancel())
                        .show();
                return true;
            }
        });

        webView.addJavascriptInterface(new Bridge(), "DSAndroid");
        setContentView(webView);
        webView.loadUrl("https://" + HOST + "/index.html");
    }

    private WebResourceResponse serveImportZip() {
        File file = new File(getCacheDir(), IMPORT_CACHE);
        if (!file.exists()) {
            return new WebResourceResponse("text/plain", "utf-8",
                    new ByteArrayInputStream("no import file".getBytes(StandardCharsets.UTF_8)));
        }
        try {
            return new WebResourceResponse("application/zip", null, new FileInputStream(file));
        } catch (IOException error) {
            return new WebResourceResponse("text/plain", "utf-8",
                    new ByteArrayInputStream(("read failed").getBytes(StandardCharsets.UTF_8)));
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
    }

    @Override
    public void onBackPressed() {
        if (isKeyboardVisible()) {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(webView.getWindowToken(), 0);
            }
            webView.clearFocus();
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return (window.__androidBack && window.__androidBack())?'1':'0';}catch(e){return '0';}})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (!"\"1\"".equals(value)) {
                            finish();
                        }
                    }
                });
    }

    private boolean isKeyboardVisible() {
        View root = getWindow().getDecorView();
        Rect rect = new Rect();
        root.getWindowVisibleDisplayFrame(rect);
        int height = root.getRootView().getHeight();
        return height > 0 && (height - rect.bottom) > height / 4;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQ_FILE) {
            ValueCallback<Uri[]> callback = fileCallback;
            fileCallback = null;
            if (callback != null) {
                callback.onReceiveValue(resultCode == RESULT_OK && data != null
                        ? WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                        : null);
            }
            return;
        }

        if (requestCode == REQ_PICK_ZIP) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                copyToCache(data.getData());
                webView.evaluateJavascript("window.__onZipPicked && window.__onZipPicked()", null);
            } else {
                webView.evaluateJavascript("window.__onZipPickCancelled && window.__onZipPickCancelled()", null);
            }
            return;
        }

        if (requestCode == REQ_SAVE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                try {
                    OutputStream out = getContentResolver().openOutputStream(data.getData());
                    InputStream in = new FileInputStream(saveFile);
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) > 0) {
                        out.write(buffer, 0, read);
                    }
                    in.close();
                    out.close();
                    Toast.makeText(this, "已保存：" + saveName, Toast.LENGTH_LONG).show();
                } catch (Exception error) {
                    Toast.makeText(this, "保存失败：" + error.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
            if (saveFile != null) {
                //noinspection ResultOfMethodCallIgnored
                saveFile.delete();
            }
            saveFile = null;
            saveName = null;
        }
    }

    private void copyToCache(Uri uri) {
        try {
            InputStream in = getContentResolver().openInputStream(uri);
            if (in == null) {
                return;
            }
            FileOutputStream out = new FileOutputStream(new File(getCacheDir(), IMPORT_CACHE));
            byte[] buffer = new byte[65536];
            int read;
            while ((read = in.read(buffer)) > 0) {
                out.write(buffer, 0, read);
            }
            in.close();
            out.close();
        } catch (Exception error) {
            Toast.makeText(this, "读取文件失败：" + error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private static String mimeOf(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webmanifest") || lower.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private static boolean isText(String mime) {
        return mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json");
    }

    private class Bridge {
        @android.webkit.JavascriptInterface
        public void openExternal(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception error) {
                        Toast.makeText(MainActivity.this, "无法打开浏览器", Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void pickZip() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("*/*");
                        startActivityForResult(intent, REQ_PICK_ZIP);
                    } catch (Exception error) {
                        Toast.makeText(MainActivity.this, "无法打开文件选择器", Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void beginSave(String name, String mime) {
            try {
                if (saveStream != null) {
                    saveStream.close();
                    saveStream = null;
                }
                saveName = name;
                saveMime = (mime == null || mime.length() == 0) ? "application/octet-stream" : mime;
                saveFile = new File(getCacheDir(), "export.tmp");
                saveStream = new FileOutputStream(saveFile);
            } catch (Exception error) {
                saveStream = null;
                saveFile = null;
            }
        }

        @android.webkit.JavascriptInterface
        public void appendSave(String base64) {
            try {
                if (saveStream != null) {
                    saveStream.write(Base64.decode(base64, Base64.DEFAULT));
                }
            } catch (Exception error) {
                // 写入失败时由 endSave 统一提示
            }
        }

        @android.webkit.JavascriptInterface
        public void endSave() {
            try {
                if (saveStream != null) {
                    saveStream.close();
                    saveStream = null;
                }
            } catch (Exception error) {
                // ignore
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (saveFile == null || !saveFile.exists() || saveFile.length() == 0) {
                        Toast.makeText(MainActivity.this, "导出失败：没有内容", Toast.LENGTH_LONG).show();
                        return;
                    }
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(saveMime == null ? "application/zip" : saveMime);
                    intent.putExtra(Intent.EXTRA_TITLE, saveName == null ? "export.zip" : saveName);
                    startActivityForResult(intent, REQ_SAVE);
                }
            });
        }
    }
}
