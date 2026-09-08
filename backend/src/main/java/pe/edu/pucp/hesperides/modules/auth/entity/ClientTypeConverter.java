package pe.edu.pucp.hesperides.modules.auth.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Traduce el enum a los valores en minúscula que exige el CHECK de V002. */
@Converter(autoApply = false)
public class ClientTypeConverter implements AttributeConverter<ClientType, String> {

    @Override
    public String convertToDatabaseColumn(ClientType attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public ClientType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ClientType.fromHeader(dbData);
    }
}