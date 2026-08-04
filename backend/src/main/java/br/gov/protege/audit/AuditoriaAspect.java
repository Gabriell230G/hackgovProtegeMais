package br.gov.protege.audit;

import br.gov.protege.service.AuditoriaService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PathVariable;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;

/**
 * Intercepta os metodos anotados com @Auditavel e grava a trilha.
 *
 * O registro acontece nos dois desfechos: sucesso grava PERMITIDO, excecao
 * grava NEGADO ou ERRO e relanca. Tentativa recusada e informacao de
 * seguranca - um sistema que so registra o que deu certo nao serve para
 * investigar abuso.
 */
@Aspect
@Component
public class AuditoriaAspect {

    private final AuditoriaService auditoria;

    public AuditoriaAspect(AuditoriaService auditoria) {
        this.auditoria = auditoria;
    }

    @Around("@annotation(auditavel)")
    public Object auditar(ProceedingJoinPoint jp, Auditavel auditavel) throws Throwable {
        String recursoId = identificadorDoRecurso(jp);
        try {
            Object retorno = jp.proceed();
            auditoria.registrar(auditavel.acao(), auditavel.recurso(), recursoId,
                    AuditoriaService.PERMITIDO, auditavel.detalhe());
            return retorno;
        } catch (org.springframework.security.access.AccessDeniedException e) {
            auditoria.registrar(auditavel.acao(), auditavel.recurso(), recursoId,
                    AuditoriaService.NEGADO, "Acesso negado pelo perfil");
            throw e;
        } catch (Throwable e) {
            auditoria.registrar(auditavel.acao(), auditavel.recurso(), recursoId,
                    AuditoriaService.ERRO, e.getClass().getSimpleName());
            throw e;
        }
    }

    /**
     * Extrai o identificador do recurso a partir do parametro anotado com
     * @PathVariable - ou seja, do proprio caminho da rota.
     *
     * A primeira versao usava "o primeiro argumento numerico do metodo", o
     * que gravava o numero da pagina como se fosse o id do recurso em rotas
     * de listagem. Ler a anotacao elimina a adivinhacao. Parametros de
     * corpo continuam ignorados de proposito: carregam dado sensivel e nao
     * podem entrar na trilha.
     */
    private String identificadorDoRecurso(ProceedingJoinPoint jp) {
        if (!(jp.getSignature() instanceof MethodSignature assinatura)) return null;

        Method metodo = assinatura.getMethod();
        Annotation[][] anotacoes = metodo.getParameterAnnotations();
        Object[] args = jp.getArgs();

        for (int i = 0; i < anotacoes.length && i < args.length; i++) {
            for (Annotation a : anotacoes[i]) {
                if (a instanceof PathVariable && args[i] != null) {
                    String valor = String.valueOf(args[i]);
                    return valor.length() <= 60 ? valor : valor.substring(0, 60);
                }
            }
        }
        return null;
    }
}
