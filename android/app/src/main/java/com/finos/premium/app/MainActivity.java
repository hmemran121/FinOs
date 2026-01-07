package com.finos.premium.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            File dbFile = getDatabasePath("finos.db");
            if (!dbFile.exists()) {
                dbFile.getParentFile().mkdirs();
                InputStream inputStream = getAssets().open("finos.db");
                OutputStream outputStream = new FileOutputStream(dbFile);
                byte[] buffer = new byte[1024];
                int length;
                while ((length = inputStream.read(buffer)) > 0) {
                    outputStream.write(buffer, 0, length);
                }
                outputStream.flush();
                outputStream.close();
                inputStream.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
