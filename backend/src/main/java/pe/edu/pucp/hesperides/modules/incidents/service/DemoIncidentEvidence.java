package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

/** Explicit, visibly labelled fixture files. Never enabled outside development. */
@Component @Profile("dev") @RequiredArgsConstructor
public class DemoIncidentEvidence implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final FileStorage storage;
    private final IncidentBusinessCalendar calendar;
    @Override public void run(ApplicationArguments args) throws Exception {
        var image=new BufferedImage(640,240,BufferedImage.TYPE_INT_RGB);
        var g=image.createGraphics();
        try {
            g.setColor(new Color(238,243,239));g.fillRect(0,0,640,240);g.setColor(new Color(20,80,40));
            g.setFont(new Font(Font.SANS_SERIF,Font.BOLD,28));g.drawString("DEMOSTRACIÓN",30,90);
            g.setFont(new Font(Font.SANS_SERIF,Font.PLAIN,19));g.drawString("Imagen de prueba. No documenta trabajo real.",30,135);
        } finally {g.dispose();}
        var out=new ByteArrayOutputStream();ImageIO.write(image,"png",out);byte[] bytes=out.toByteArray();
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        for (Long id:jdbc.queryForList("""
            SELECT l.id FROM intervention_locations l JOIN interventions w ON w.id=l.intervention_id
            JOIN users u ON u.id=w.created_by_user_id JOIN catalog_items s ON s.id=l.status_item_id
            WHERE l.client_reference::text LIKE '31000000-0000-4000-8000-%' AND w.external_code LIKE 'DEMO-OSG-WORK-%'
              AND u.email='coordinador@demo.invalid' AND l.attempt_number=1 AND s.code IN('COMPLETED','OBSERVED','VALIDATED')
            """,Long.class)) {
            String key="interventions/demo-osg/"+id+".png";
            storage.put(key,bytes,"image/png");
            jdbc.update("""
                INSERT INTO intervention_evidences(intervention_id,intervention_location_id,attempt_number,client_reference,
                  moment_item_id,storage_key,original_filename,content_type,size_bytes,content_sha256,caption,uploaded_by_user_id,uploaded_at)
                SELECT l.intervention_id,l.id,1,l.client_reference,ci.id,?,'demostracion.png','image/png',?,?,
                  'DEMOSTRACIÓN: imagen de prueba, no evidencia real del campus',l.executed_by_user_id,l.completed_at
                FROM intervention_locations l JOIN catalog_items ci ON ci.code='AFTER'
                JOIN catalog_types ct ON ct.id=ci.catalog_type_id AND ct.code='EVIDENCE_MOMENT'
                WHERE l.id=? AND NOT EXISTS(SELECT 1 FROM intervention_evidences e WHERE e.client_reference=l.client_reference)
                """,key,bytes.length,hash,id);
        }
        jdbc.query("SELECT id,created_at,resolved_at FROM incidents WHERE client_reference::text LIKE '30000000-0000-4000-8000-%' AND resolved_at IS NOT NULL AND closure_business_days IS NULL",
                (org.springframework.jdbc.core.RowCallbackHandler) row -> jdbc.update("UPDATE incidents SET closure_business_days=? WHERE id=?",
                        calendar.count(row.getTimestamp("created_at").toInstant(),row.getTimestamp("resolved_at").toInstant()),row.getLong("id")));
    }
}
