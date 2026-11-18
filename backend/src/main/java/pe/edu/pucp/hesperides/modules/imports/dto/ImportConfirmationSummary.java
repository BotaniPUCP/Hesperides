package pe.edu.pucp.hesperides.modules.imports.dto;

/** Counts from the exact saved specimen plan after the user's duplicate decisions. */
public record ImportConfirmationSummary(long batchId, int toCreate, int toUpdate, String fingerprint) {
}
