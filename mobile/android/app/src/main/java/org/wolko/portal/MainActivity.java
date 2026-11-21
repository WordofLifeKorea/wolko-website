package org.wolko.portal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 앱 전용 도우미는 화면이 만들어지기 전에 등록해야 첫 페이지부터 들어간다
        registerPlugin(WolkoAppPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
