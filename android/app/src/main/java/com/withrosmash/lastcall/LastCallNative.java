package com.withrosmash.lastcall;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Environment;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.lang.ref.WeakReference;
import java.nio.charset.StandardCharsets;

/**
 * The bits of the app no off-the-shelf plugin covers:
 *
 * - Battery-optimisation exemption (Samsung's Device Care stops foreground
 *   services of "sleeping" apps, which silently ends a night mid-record).
 * - The hardware step counter. It accumulates in silicon regardless of app
 *   state — the only way a phone in a pocket records real numbers. The
 *   WebView's accelerometer heard 89 of a 5,500-step walk.
 * - Saving the share card into the system gallery. An <a download> click does
 *   nothing inside Android's WebView.
 * - A SharedPreferences mirror of "a night is open" for the boot receiver.
 */
@CapacitorPlugin(
        name = "LastCallNative",
        permissions = {
                @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity")
        })
public class LastCallNative extends Plugin implements SensorEventListener {

    public static final String PREFS = "lastcall";
    public static final String KEY_SESSION_ACTIVE = "session_active";
    public static final String KEY_PENDING_LOGS = "pending_logs";

    private static final int QUICKLOG_NOTIFICATION_ID = 7;
    private static final String QUICKLOG_CHANNEL = "lastcall_quicklog";

    // The quick-log receiver runs with no bridge of its own; this lets it nudge
    // a live instance so taps land immediately when the WebView is awake.
    private static WeakReference<LastCallNative> live = new WeakReference<>(null);

    @Override
    public void load() {
        live = new WeakReference<>(this);
    }

    static void emitQuickLog() {
        LastCallNative plugin = live.get();
        if (plugin != null) plugin.notifyListeners("quicklog", new JSObject());
    }

    /* ---------- battery optimisation ---------- */

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

    /* ---------- session flag ---------- */

    @PluginMethod
    public void setSessionActive(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_SESSION_ACTIVE, active).apply();
        call.resolve();
    }

    /* ---------- hardware step counter ----------
       TYPE_STEP_COUNTER reports steps-since-boot, cumulative in hardware, so a
       gap in event delivery loses nothing: the next event carries the total.
       JS receives steps since the listener started and converts to deltas. */

    private SensorManager sensorManager;
    private boolean counting = false;
    private float baseline = -1f;

    @PluginMethod
    public void startStepCount(PluginCall call) {
        // ACTIVITY_RECOGNITION is runtime-gated only from Android 10.
        if (Build.VERSION.SDK_INT >= 29
                && getPermissionState("activity") != PermissionState.GRANTED) {
            requestPermissionForAlias("activity", call, "stepPermissionCallback");
            return;
        }
        beginCounting(call);
    }

    @PermissionCallback
    private void stepPermissionCallback(PluginCall call) {
        if (getPermissionState("activity") == PermissionState.GRANTED) {
            beginCounting(call);
        } else {
            JSObject ret = new JSObject();
            ret.put("available", false);
            call.resolve(ret);
        }
    }

    private void beginCounting(PluginCall call) {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Sensor sensor = sensorManager != null
                ? sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
                : null;

        JSObject ret = new JSObject();
        if (sensor == null) {
            ret.put("available", false);
            call.resolve(ret);
            return;
        }

        baseline = -1f;
        counting = true;
        // 5s max report latency lets the sensor batch in hardware instead of
        // waking the SoC per step.
        sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL, 5_000_000);
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopStepCount(PluginCall call) {
        if (sensorManager != null) sensorManager.unregisterListener(this);
        counting = false;
        baseline = -1f;
        call.resolve();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!counting || event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;
        float value = event.values[0];
        if (baseline < 0f) baseline = value;
        JSObject data = new JSObject();
        data.put("steps", Math.round(value - baseline));
        notifyListeners("steps", data);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    /* ---------- quick log from the notification shade ----------
       A second, silent ongoing notification with two action buttons. Taps go
       to a BroadcastReceiver that appends {type, t} to SharedPreferences —
       native code cannot reach the WebView's localStorage — and JS drains the
       queue when it next runs. The tap's own timestamp is what gets recorded,
       so the log is accurate even if it lands minutes later. */

    @PluginMethod
    public void showQuickLog(PluginCall call) {
        Context ctx = getContext();
        String drinkLabel = call.getString("drinkLabel", "Drink");
        NotificationManager manager =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) { call.reject("no notification manager"); return; }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    QUICKLOG_CHANNEL, "Quick log", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Log a drink or water from the shade while a night is open.");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }

        PendingIntent drink = quickLogIntent(ctx, "drink", 1);
        PendingIntent water = quickLogIntent(ctx, "water", 2);

        Notification notification = new NotificationCompat.Builder(ctx, QUICKLOG_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_lastcall)
                .setContentTitle("Quick log")
                .setContentText("Log without opening the app.")
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(0, drinkLabel, drink)
                .addAction(0, "Water", water)
                .build();

        manager.notify(QUICKLOG_NOTIFICATION_ID, notification);
        call.resolve();
    }

    private PendingIntent quickLogIntent(Context ctx, String type, int requestCode) {
        Intent intent = new Intent(ctx, QuickLogReceiver.class)
                .setAction(QuickLogReceiver.ACTION)
                .putExtra(QuickLogReceiver.EXTRA_TYPE, type);
        return PendingIntent.getBroadcast(
                ctx, requestCode, intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    @PluginMethod
    public void hideQuickLog(PluginCall call) {
        NotificationManager manager =
                (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(QUICKLOG_NOTIFICATION_ID);
        call.resolve();
    }

    @PluginMethod
    public void drainPendingLogs(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_PENDING_LOGS, "[]");
        prefs.edit().putString(KEY_PENDING_LOGS, "[]").apply();
        JSObject ret = new JSObject();
        try {
            ret.put("events", new com.getcapacitor.JSArray(raw));
        } catch (Exception e) {
            ret.put("events", new com.getcapacitor.JSArray());
        }
        call.resolve(ret);
    }

    /* ---------- text files to Downloads ----------
       Used for GPX routes and the JSON history export. The web <a download>
       path is a no-op inside the WebView — same failure the card save had. */

    @PluginMethod
    public void saveTextFile(PluginCall call) {
        String name = call.getString("name", "lastcall.txt");
        String mime = call.getString("mime", "text/plain");
        String text = call.getString("data");
        if (text == null) { call.reject("No data"); return; }
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);

        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, name);
                values.put(MediaStore.Downloads.MIME_TYPE, mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/Last Call");
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) { call.reject("MediaStore refused the insert"); return; }
                try (OutputStream out = resolver.openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("null stream");
                    out.write(bytes);
                }
            } else {
                File dir = new File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                        "Last Call");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("mkdir failed");
                try (FileOutputStream out = new FileOutputStream(new File(dir, name))) {
                    out.write(bytes);
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage());
        }
    }

    /* ---------- gallery save ---------- */

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String data = call.getString("data");
        String name = call.getString("name", "lastcall.png");
        if (data == null || data.isEmpty()) {
            call.reject("No image data");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Image data was not valid base64");
            return;
        }

        try {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            if (Build.VERSION.SDK_INT >= 29) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Last Call");
            }
            Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("MediaStore refused the insert");
                return;
            }
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException("null stream");
                out.write(bytes);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Save failed: " + e.getMessage());
        }
    }
}
