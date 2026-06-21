import { useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Card, CardHeader, Form, FormGroup, FormItem,
  Label, Input, Select, Option, Button, BusyIndicator, MessageStrip, ObjectStatus,
} from '@ui5/webcomponents-react';
import type { Ui5CustomEvent } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';

// Mirrors the SaaS SettingsPage `CompanySettings` interface + the
// `get_company_settings` / `update_company_settings` commands.
interface CompanySettings {
  company_name: string;
  cui: string;
  reg_com: string;
  address: string;
  city: string;
  county: string;
  bank_name: string;
  iban: string;
  tva_rate: number;
  default_currency: string;
  eur_to_ron_rate: number;
  eur_to_ron_rate_updated_at?: string | null;
  eur_to_ron_rate_source?: string | null;
}

// Text fields edited on the company form (field key + Romanian label).
const TEXT_FIELDS: { key: keyof CompanySettings; label: string; placeholder?: string }[] = [
  { key: 'company_name', label: 'Denumire firmă' },
  { key: 'cui', label: 'CUI', placeholder: 'RO12345678' },
  { key: 'reg_com', label: 'Nr. Reg. Comerțului' },
  { key: 'address', label: 'Adresă' },
  { key: 'city', label: 'Oraș' },
  { key: 'county', label: 'Județ' },
  { key: 'bank_name', label: 'Banca' },
  { key: 'iban', label: 'IBAN', placeholder: 'RO00 BANK 0000 0000 0000 0000' },
];

const NUMBER_FIELDS: { key: keyof CompanySettings; label: string }[] = [
  { key: 'tva_rate', label: 'Cotă TVA (ex: 0.19 = 19%)' },
  { key: 'eur_to_ron_rate', label: 'Curs EUR/RON' },
];

function inputValue(e: Ui5CustomEvent<{ value: string }>): string {
  return (e.target as unknown as { value: string }).value ?? '';
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('ro-RO');
}

export default function FioriSettingsPage({ user }: { user: User }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'Positive' | 'Negative'; text: string } | null>(null);

  const load = useMemo(() => () => {
    setLoading(true);
    apiCommand<CompanySettings>('get_company_settings')
      .then(s => setSettings(s))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key: keyof CompanySettings, value: string | number) => {
    setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
    setMessage(null);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiCommand<CompanySettings>('update_company_settings', {
        ...settings,
        tva_rate: settings.tva_rate,
      });
      setSettings(result);
      setMessage({ type: 'Positive', text: 'Setările au fost salvate.' });
    } catch (err) {
      setMessage({ type: 'Negative', text: err instanceof Error ? err.message : 'Eroare la salvare.' });
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = user.role_name === 'admin' ? 'Administrator' : (user.role_name || 'Utilizator');

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Setări</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--sapContent_LabelColor)' }}>
            {`Cont conectat: ${user.username}`}
          </span>
          <Button design="Transparent" onClick={load}>Reîmprospătează</Button>
        </div>

        {message && (
          <MessageStrip
            design={message.type === 'Positive' ? 'Positive' : 'Negative'}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </MessageStrip>
        )}

        {/* Account (read-only) — sourced from the authenticated user */}
        <Card header={<CardHeader titleText="Cont" subtitleText="Date profil utilizator (doar citire)" />}>
          <div style={{ padding: '0.5rem 1rem 1rem' }}>
            <Form labelSpan="S12 M4 L4 XL4">
              <FormGroup headerText="Profil">
                <FormItem labelContent={<Label>Utilizator</Label>}>
                  <span>{user.username || '—'}</span>
                </FormItem>
                <FormItem labelContent={<Label>Nume complet</Label>}>
                  <span>{user.full_name || '—'}</span>
                </FormItem>
                <FormItem labelContent={<Label>Email</Label>}>
                  <span>{user.email || '—'}</span>
                </FormItem>
                <FormItem labelContent={<Label>Funcție / titlu</Label>}>
                  <span>{user.job_title || '— (setat de admin)'}</span>
                </FormItem>
                <FormItem labelContent={<Label>Rol</Label>}>
                  <ObjectStatus state={user.role_name === 'admin' ? 'Information' : 'None'}>{roleLabel}</ObjectStatus>
                </FormItem>
              </FormGroup>
            </Form>
          </div>
        </Card>

        {/* Company / fiscal settings (editable) */}
        <Card header={<CardHeader titleText="Companie" subtitleText="Date firmă și setări fiscale" />}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <BusyIndicator active size="L" />
            </div>
          ) : !settings ? (
            <div style={{ padding: '1.5rem' }}>
              <MessageStrip design="Critical" hideCloseButton>
                Nu am putut încărca setările companiei.
              </MessageStrip>
            </div>
          ) : (
            <div style={{ padding: '0.5rem 1rem 1rem' }}>
              <Form labelSpan="S12 M4 L4 XL4">
                <FormGroup headerText="Date firmă">
                  {TEXT_FIELDS.map(f => (
                    <FormItem key={f.key} labelContent={<Label>{f.label}</Label>}>
                      <Input
                        value={String(settings[f.key] ?? '')}
                        placeholder={f.placeholder}
                        onChange={e => update(f.key, inputValue(e))}
                        style={{ width: '100%' }}
                      />
                    </FormItem>
                  ))}
                </FormGroup>

                <FormGroup headerText="Setări fiscale">
                  {NUMBER_FIELDS.map(f => (
                    <FormItem key={f.key} labelContent={<Label>{f.label}</Label>}>
                      <Input
                        type="Number"
                        value={String(settings[f.key] ?? '')}
                        onChange={e => update(f.key, parseFloat(inputValue(e)) || 0)}
                        style={{ width: '100%' }}
                      />
                    </FormItem>
                  ))}
                  <FormItem labelContent={<Label>Monedă implicită</Label>}>
                    <Select
                      onChange={e => update('default_currency', (e.detail.selectedOption as unknown as { value: string }).value)}
                      style={{ width: '100%' }}
                    >
                      <Option selected={settings.default_currency === 'RON'} value="RON">RON</Option>
                      <Option selected={settings.default_currency === 'EUR'} value="EUR">EUR</Option>
                    </Select>
                  </FormItem>
                  <FormItem labelContent={<Label>Curs actualizat</Label>}>
                    <span>
                      {formatDate(settings.eur_to_ron_rate_updated_at)}
                      {settings.eur_to_ron_rate_source
                        ? ` · ${settings.eur_to_ron_rate_source === 'bnr' ? 'BNR' : 'manual'}`
                        : ''}
                    </span>
                  </FormItem>
                </FormGroup>
              </Form>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button design="Emphasized" disabled={saving} onClick={save}>
                  {saving ? 'Se salvează...' : 'Salvează'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DynamicPage>
  );
}
