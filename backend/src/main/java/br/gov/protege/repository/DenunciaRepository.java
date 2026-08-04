package br.gov.protege.repository;

import br.gov.protege.model.Denuncia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    Optional<Denuncia> findByProtocoloAndExcluidaFalse(String protocolo);

    Optional<Denuncia> findByIdAndExcluidaFalse(Long id);

    List<Denuncia> findByExcluidaFalseOrderByCriadoEmDesc();

    boolean existsByProtocolo(String protocolo);

    /**
     * Busca paginada com filtros opcionais.
     *
     * Os filtros sao resolvidos pelo banco, e nao com stream() sobre a lista
     * inteira em memoria como antes. Com uma base real de denuncias, filtrar
     * em Java significa carregar tudo do banco para descartar quase tudo.
     */
    @Query("""
           SELECT d FROM Denuncia d
           WHERE d.excluida = false
             AND (:status IS NULL OR LOWER(d.status) = LOWER(:status))
             AND (:tipo   IS NULL OR LOWER(d.tipo)   = LOWER(:tipo))
             AND (:estado IS NULL OR UPPER(d.estado) = UPPER(:estado))
           """)
    Page<Denuncia> buscarComFiltros(@Param("status") String status,
                                    @Param("tipo") String tipo,
                                    @Param("estado") String estado,
                                    Pageable pageable);

    /** Casos concluidos, usados no calculo de lead time (Parte 4). */
    @Query("""
           SELECT d FROM Denuncia d
           WHERE d.excluida = false
             AND d.concluidaEm IS NOT NULL
           """)
    List<Denuncia> findConcluidas();

    long countByStatusAndExcluidaFalse(String status);
}
