package org.wolko.portal;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * 사진을 받을 수 있는 파일 칸(예: 경비 영수증 accept="image/*,application/pdf")을 누르면
 * 크롬 브라우저처럼 "카메라로 찍기"와 "사진·파일 고르기"를 한 창에서 고르게 한다.
 * (기본 앱 화면은 capture 가 없는 칸에서 고르기만 보여 줘서 영수증을 바로 찍을 수 없었다)
 * capture 가 있는 칸(차량 기록 사진 찍기)이나 사진이 아닌 칸(PDF만)은 원래대로 둔다.
 */
public class WolkoChromeClient extends BridgeWebChromeClient {

    private final Bridge bridge;
    private final ActivityResultLauncher<Intent> launcher;
    private ValueCallback<Uri[]> pending;
    private File cameraFile;
    private Uri cameraUri;

    public WolkoChromeClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
        this.launcher = bridge.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), this::onResult);
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
        List<String> mimes = mimeTypes(params.getAcceptTypes());
        boolean acceptsImages = mimes.isEmpty();
        for (String m : mimes) if (m.startsWith("image/") || m.equals("*/*")) acceptsImages = true;
        if (params.isCaptureEnabled() || !acceptsImages) {
            return super.onShowFileChooser(webView, filePathCallback, params);
        }

        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        if (mimes.size() == 1) {
            pick.setType(mimes.get(0));
        } else {
            pick.setType("*/*");
            if (!mimes.isEmpty()) pick.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
        }
        if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

        Intent chooser = Intent.createChooser(pick, "사진 찍기 또는 파일 고르기");
        Intent camera = cameraIntent();
        if (camera != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { camera });

        if (pending != null) pending.onReceiveValue(null);
        pending = filePathCallback;
        try {
            launcher.launch(chooser);
        } catch (ActivityNotFoundException e) {
            pending = null;
            filePathCallback.onReceiveValue(null);
        }
        return true;
    }

    private Intent cameraIntent() {
        Context context = bridge.getContext();
        try {
            File dir = new File(context.getCacheDir(), "camera");
            if (!dir.exists() && !dir.mkdirs()) return null;
            cameraFile = File.createTempFile("photo_", ".jpg", dir);
            cameraUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", cameraFile);
        } catch (IOException | IllegalArgumentException e) {
            cameraFile = null;
            cameraUri = null;
            return null;
        }
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private void onResult(ActivityResult result) {
        ValueCallback<Uri[]> callback = pending;
        pending = null;
        if (callback == null) return;
        Uri[] uris = null;
        Intent data = result.getData();
        if (result.getResultCode() == Activity.RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                uris = new Uri[n];
                for (int i = 0; i < n; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                uris = new Uri[] { data.getData() };
            } else if (cameraFile != null && cameraFile.length() > 0) {
                uris = new Uri[] { cameraUri };
            }
        }
        // 카메라를 안 썼으면 미리 만들어 둔 빈 사진 파일은 지운다
        if (cameraFile != null && cameraFile.length() == 0) cameraFile.delete();
        callback.onReceiveValue(uris);
    }

    /** accept 값("image/*", "application/pdf", ".pdf" 등)을 휴대폰이 알아듣는 형식으로 바꾼다 */
    private static List<String> mimeTypes(String[] accept) {
        List<String> out = new ArrayList<>();
        if (accept == null) return out;
        for (String raw : accept) {
            for (String part : raw.split(",")) {
                String t = part.trim().toLowerCase();
                if (t.isEmpty()) continue;
                if (t.startsWith(".")) {
                    String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(t.substring(1));
                    if (m != null) t = m;
                    else continue;
                }
                if (!out.contains(t)) out.add(t);
            }
        }
        return out;
    }
}
