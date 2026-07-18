export interface MetaDisplayActions {
  onPrimaryInput: () => void;
  onLeftInput: () => void;
  onRightInput: () => void;
  onUpInput: () => void;
  onDownInput: () => void;
}

export function registerMetaDisplayAdapter(_actions: MetaDisplayActions): void {
  // Integre aqui os eventos reais do Meta Ray-Ban Display quando o SDK estiver disponivel.
  // A logica de negocio deve continuar chamando apenas as callbacks recebidas aqui.
}
