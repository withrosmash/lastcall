package com.withrosmash.lastcall;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The bits of "keep tracking alive" that no off-the-shelf plugin covers.
 *
 * Samsung's Device Care is the most aggressive battery manager on Android: it
 * puts apps to "sleep" and silently stops their foreground services, which for
 * this app means a night that quietly stops recording. Being on the battery
 * optimisation allow-list is the single biggest thing that prevents it, so the
 * app both requests it and can check afterwards whether it actually stuck.
 */
@CapacitorPlugin(name = "LastCallNative")
public class LastCallNative extends Plugin {

    public static final String PREFS = "lastcall";
    public static final String KEY_SESSION_ACTIVE = "session_active";

    static boolean isExempt(Context ctx) {
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (pm == null) return true;
        return pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ignoring", isExempt(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();

        if (isExempt(ctx)) {
            ret.put("ignoring", true);
            ret.put("prompted", false);
            call.resolve(ret);
            return;
        }

        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            ret.put("prompted", true);
        } catch (Exception direct) {
            // Some OEM builds refuse the direct request. Fall back to the
            // system list, which is always available.
            try {
                Intent list = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                list.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(list);
                ret.put("prompted", true);
            } catch (Exception fallback) {
                ret.put("prompted", false);
            }
        }

        ret.put("ignoring", isExempt(ctx));
        call.resolve(ret);
    }

    /** Opens this app's system settings page — where Samsung hides Battery > Unrestricted. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", ctx.getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open app settings");
        }
    }

    /**
     * Mirrors "a night is open" somewhere native code can read it. The web
     * layer's storage is inside the WebView and invisible to a broadcast
     * receiver that runs after a reboot.
     */
    @PluginMethod
    public void setSessionActive(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_SESSION_ACTIVE, active).apply();
        call.resolve();
    }
}
