package br.gov.protege.repository;

import br.gov.protege.model.AuditoriaLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * A trilha e somente de escrita e leitura: nao ha metodo de atualizacao
 * nem de exclusao neste repositorio, por decisao de projeto.
 */
public interface AuditoriaLogRepository extends JpaRepository<AuditoriaLog, Long> {

    Optional<AuditoriaLog> findFirstByOrderByIdDesc();

    List<AuditoriaLog> findAllByOrderByIdAsc();

    @Query("""
           SELECT a FROM AuditoriaLog a
           WHERE (:usuario IS NULL OR LOWER(a.usuario) LIKE LOWER(CONCAT('%', :usuario, '%')))
             AND (:acao    IS NULL OR a.acao = :acao)
             AND (:inicio  IS NULL OR a.dataHora >= :inicio)
             AND (:fim     IS NULL OR a.dataHora <= :fim)
           """)
    Page<AuditoriaLog> buscar(@Param("usuario") String usuario,
                              @Param("acao") String acao,
                              @Param("inicio") LocalDateTime inicio,
                              @Param("fim") LocalDateTime fim,
                              Pageable pageable);
}
