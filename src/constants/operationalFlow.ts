

export type OperationalFlow = {
  proiectare_info: {
    necesar_materiale_incarcate: boolean;
    comenzi_ac: boolean;
    marfa_fz_aviz: boolean;
    factura_inregistrata: boolean;
  };
  productie: {
    task_hala_zilnic: boolean;
    bon_consum_emis: boolean;
    stock_actualizat: boolean;
    productie_componenta: boolean;
    inregistrare_magazie: boolean;
  };
  montaj: {
    componente_teren_aviz: boolean;
    diurna: boolean;
    combustibil: boolean;
    cazare: 'neutru' | 'da' | 'nu';
    factura_finala: boolean;
  };
};

export function defaultOperationalFlow(): OperationalFlow {
  return {
    proiectare_info: {
      necesar_materiale_incarcate: false,
      comenzi_ac: false,
      marfa_fz_aviz: false,
      factura_inregistrata: false,
    },
    productie: {
      task_hala_zilnic: false,
      bon_consum_emis: false,
      stock_actualizat: false,
      productie_componenta: false,
      inregistrare_magazie: false,
    },
    montaj: {
      componente_teren_aviz: false,
      diurna: false,
      combustibil: false,
      cazare: 'neutru',
      factura_finala: false,
    },
  };
}

export function parseOperationalFlowJson(raw: string | null | undefined): OperationalFlow {
  if (!raw || !raw.trim()) return defaultOperationalFlow();
  try {
    const o = JSON.parse(raw) as Partial<OperationalFlow>;
    const d = defaultOperationalFlow();
    return {
      proiectare_info: { ...d.proiectare_info, ...o.proiectare_info },
      productie: { ...d.productie, ...o.productie },
      montaj: { ...d.montaj, ...o.montaj },
    };
  } catch {
    return defaultOperationalFlow();
  }
}
