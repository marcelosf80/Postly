package com.socialpulse.marketing;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(NativeUIPlugin.class);
        registerPlugin(AdMobPlugin.class);
    }
}
