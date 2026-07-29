package br.gov.protege.model;

import jakarta.persistence.Embeddable;

/**
 * Um passo na linha do tempo da denuncia (mudanca de status).
 */
@Embeddable
public class HistoricoItem {

    private String status;
    private String data;  // dd/MM/yyyy
    private String hora;  // HH:mm

    public HistoricoItem() {}

    public HistoricoItem(String status, String data, String hora) {
        this.status = status;
        this.data = data;
        this.hora = hora;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getData() { return data; }
    public void setData(String data) { this.data = data; }

    public String getHora() { return hora; }
    public void setHora(String hora) { this.hora = hora; }
}
