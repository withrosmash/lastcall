package app.sprell;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Handles the quick-log notification's action buttons. Native code cannot
 * reach the WebView's localStorage, so taps append {type, t} to
 * SharedPreferences and JS drains the queue when it next runs — the tap's
 * timestamp, not the drain's, is what ends up in the night.
 */
public class QuickLogReceiver extends BroadcastReceiver {

    public static final String ACTION = "app.sprell.QUICK_LOG";
    public static final String EXTRA_TYPE = "type";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;
        String type = intent.getStringExtra(EXTRA_TYPE);
        if (!"drink".equals(type) && !"water".equals(type)) return;

        SharedPreferences prefs =
                context.getSharedPreferences(SprellNative.PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray queue = new JSONArray(prefs.getString(SprellNative.KEY_PENDING_LOGS, "[]"));
            JSONObject event = new JSONObject();
            event.put("type", type);
            event.put("t", System.currentTimeMillis());
            queue.put(event);
            prefs.edit().putString(SprellNative.KEY_PENDING_LOGS, queue.toString()).apply();
        } catch (JSONException ignored) {
            return;
        }

        // If the WebView happens to be awake, land the tap immediately.
        SprellNative.emitQuickLog();
    }
}
