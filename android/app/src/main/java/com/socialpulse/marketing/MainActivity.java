package com.socialpulse.marketing;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.facebooklogin.FacebookLogin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FacebookLogin.class);
        registerPlugin(AdMobPlugin.class);
        registerPlugin(NativeUIPlugin.class);
    }
}
