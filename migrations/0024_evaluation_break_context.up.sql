BEGIN;

ALTER TABLE public.evaluaciones
    ADD COLUMN quiebre_id BIGINT;

ALTER TABLE public.evaluaciones
    ADD CONSTRAINT evaluaciones_quiebre_id_fkey
    FOREIGN KEY (quiebre_id)
    REFERENCES public.quiebres(id);

CREATE INDEX idx_evaluaciones_quiebre_id
    ON public.evaluaciones(quiebre_id);

COMMENT ON COLUMN public.evaluaciones.quiebre_id IS
'Quiebre de negocio asociado a la evaluación. Permite persistir evaluaciones con o sin campaña.';

COMMIT;