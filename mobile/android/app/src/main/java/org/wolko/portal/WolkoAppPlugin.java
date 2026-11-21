package org.wolko.portal;

import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;

/**
 * 앱 전용 도우미.
 * - 모든 wolko.org 페이지가 열릴 때 사이트의 /wolko-app.js 를 불러 넣는다.
 *   (내려받기 → 공유·저장 창, 같은 사이트 새 창 → 앱 안에서 열기 등은 그 파일이 맡는다.
 *    그래서 그 동작을 고칠 때는 사이트만 고치면 되고 앱을 다시 낼 필요가 없다)
 * - printPage(): 지금 화면을 휴대폰 인쇄 창으로 보낸다. 인쇄 창이 닫힌 뒤에 끝났다고 알린다.
 */
@CapacitorPlugin(name = "WolkoApp")
public class WolkoAppPlugin extends Plugin {

    static final String LOADER =
        "(function(){if(window.__wolkoAppLoader)return;window.__wolkoAppLoader=1;" +
        "var s=document.createElement('script');" +
        "s.src=location.origin+'/wolko-app.js?h='+Math.floor(Date.now()/36e5);" +
        "(document.head||document.documentElement).appendChild(s);})();";

    @Override
    public void load() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Logger.warn("WolkoApp", "이 휴대폰의 웹 화면 엔진이 오래되어 앱 도우미를 넣지 못했습니다");
            return;
        }
        Set<String> origins = new HashSet<>();
        origins.add("https://wolko.org");
        String serverUrl = getBridge().getServerUrl();
        if (serverUrl != null) {
            Uri uri = Uri.parse(serverUrl);
            origins.add(uri.getScheme() + "://" + uri.getAuthority());
        }
        WebViewCompat.addDocumentStartJavaScript(getBridge().getWebView(), LOADER, origins);
    }

    @PluginMethod
    public void printPage(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WebView webView = getBridge().getWebView();
            String title = webView.getTitle();
            String jobName = (title == null || title.isEmpty()) ? "WOLKO" : title;
            PrintDocumentAdapter inner = webView.createPrintDocumentAdapter(jobName);
            PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
            printManager.print(jobName, new FinishAwareAdapter(inner, call::resolve), new PrintAttributes.Builder().build());
        });
    }

    /** 웹 화면의 인쇄 어댑터를 그대로 쓰되, 인쇄 창이 끝났을 때(onFinish) 알려 준다 */
    private static class FinishAwareAdapter extends PrintDocumentAdapter {
        private final PrintDocumentAdapter inner;
        private final Runnable onDone;

        FinishAwareAdapter(PrintDocumentAdapter inner, Runnable onDone) {
            this.inner = inner;
            this.onDone = onDone;
        }

        @Override
        public void onStart() {
            inner.onStart();
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
            inner.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancellationSignal, WriteResultCallback callback) {
            inner.onWrite(pages, destination, cancellationSignal, callback);
        }

        @Override
        public void onFinish() {
            inner.onFinish();
            onDone.run();
        }
    }
}
