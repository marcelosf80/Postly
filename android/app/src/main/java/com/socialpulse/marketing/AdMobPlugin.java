package com.socialpulse.marketing;

import android.app.Activity;
import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

@CapacitorPlugin(name = "AdMob")
public class AdMobPlugin extends Plugin {
    private static final String TAG = "AdMobPlugin";
    private RewardedAd rewardedAd;
    private final String REWARDED_AD_UNIT_ID = "ca-app-pub-5343221992536229/3520448384";

    @Override
    public void load() {
        super.load();
        // Inicializar SDK en hilo principal si es necesario
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            MobileAds.initialize(getContext(), initializationStatus -> {
                Log.d(TAG, "AdMob SDK Initialized");
                loadRewardedAd(null); // Pre-carga inicial
            });
        });
    }

    @PluginMethod
    public void loadRewardedAd(PluginCall call) {
        loadRewardedAdInternal(call, REWARDED_AD_UNIT_ID, true);
    }

    private void loadRewardedAdInternal(PluginCall call, String unitId, boolean retryWithTest) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            RewardedAd.load(getContext(), unitId, adRequest, new RewardedAdLoadCallback() {
                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    if (retryWithTest) {
                        Log.w(TAG, "Prod ad failed, trying TEST unit...");
                        loadRewardedAdInternal(call, "ca-app-pub-3940256099942544/5224354917", false);
                    } else {
                        rewardedAd = null;
                        Log.e(TAG, "Failed to load ad: " + loadAdError.getMessage());
                        if (call != null) call.reject(loadAdError.getMessage());
                    }
                }

                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    rewardedAd = ad;
                    Log.d(TAG, "Ad loaded successfully from: " + unitId);
                    if (call != null) {
                        JSObject ret = new JSObject();
                        ret.put("loaded", true);
                        call.resolve(ret);
                    }
                }
            });
        });
    }

    @PluginMethod
    public void showRewardedAd(PluginCall call) {
        if (rewardedAd == null) {
            call.reject("El anuncio no está listo aún.");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            rewardedAd.show(activity, rewardItem -> {
                // El usuario ganó la recompensa
                Log.d(TAG, "User earned reward: " + rewardItem.getAmount() + " " + rewardItem.getType());
                JSObject ret = new JSObject();
                ret.put("completed", true);
                ret.put("rewardAmount", rewardItem.getAmount());
                ret.put("rewardType", rewardItem.getType());
                call.resolve(ret);
                
                // Limpiar y pre-cargar el siguiente
                rewardedAd = null;
                loadRewardedAd(null);
            });
        });
    }

    @PluginMethod
    public void isAdReady(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ready", rewardedAd != null);
        call.resolve(ret);
    }
}
