package br.gov.protege.repository;

import br.gov.protege.model.Evidencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EvidenciaRepository extends JpaRepository<Evidencia, Long> {

    List<Evidencia> findByDenunciaIdAndRemovidaFalseOrderByEnviadoEmAsc(Long denunciaId);

    Optional<Evidencia> findByIdAndRemovidaFalse(Long id);

    long countByDenunciaIdAndRemovidaFalse(Long denunciaId);
}
