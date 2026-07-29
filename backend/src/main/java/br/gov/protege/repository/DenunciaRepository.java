package br.gov.protege.repository;

import br.gov.protege.model.Denuncia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    Optional<Denuncia> findByProtocolo(String protocolo);

    List<Denuncia> findByStatus(String status);

    List<Denuncia> findAllByOrderByCriadoEmDesc();

    long countByStatus(String status);
}
