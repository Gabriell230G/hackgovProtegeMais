package br.gov.protege.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca um endpoint cuja execucao deve gerar registro na trilha de auditoria.
 *
 * A anotacao existe para que a regra "esta operacao e auditada" fique
 * declarada junto do endpoint, e nao espalhada em chamadas manuais dentro
 * dos servicos - onde seria facil esquecer de incluir numa rota nova.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditavel {

    /** Ver as constantes de AuditoriaService. */
    String acao();

    /** Recurso afetado. Ex.: "Denuncia", "Membro", "AuditoriaLog". */
    String recurso() default "";

    /** Descricao curta e NAO sensivel do que a operacao faz. */
    String detalhe() default "";
}
