package com.withrosmash.lastcall;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/**
 * A reboot kills the foreground service, and nothing can restart location
 * tracking without the user coming back to the app — Android does not allow a
 * receiver to launch an activity from the background, and a service started
 * here could not ask for the permissions it needs.
 *
 * So rather than pretend the night is still recording, this says so plainly and
 * offers one tap back in. Silently losing hours of a night is the worse
 * failure.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String CHANNEL_ID = "lastcall_resume";
    private static final int NOTIFICATION_ID = 42;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        SharedPreferences prefs =
                context.getSharedPreferences(LastCallNative.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(LastCallNative.KEY_SESSION_ACTIVE, false)) return;

        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Tracking interrupted", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Shown when a night was still open after a restart.");
            manager.createNotificationChannel(channel);
        }

        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_lastcall)
                .setContentTitle("Last Call stopped tracking")
                .setContentText("Your phone restarted. Tap to pick the night back up.")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pending)
                .setAutoCancel(true)
                .build();

        manager.notify(NOTIFICATION_ID, notification);
    }
}
