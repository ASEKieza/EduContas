"use client";

import { useState, useMemo } from "react";
import { useWindowManager } from "@/lib/windowManager";

// ── PGCA Angola — Decreto n.º 82/01 ──────────────────────────────────────────
type AccountType = "movimento" | "acumulacao" | "classe";
type NatureType = "devedora" | "credora";

interface Account {
  code: string;
  name: string;
  type: AccountType;
  nature: NatureType;
  classe: number;
  parent?: string;
  children?: Account[];
  isCustom?: boolean;
  description?: string;
  iva?: boolean;
  locked?: boolean; // PGCA base accounts — cannot be deleted
}

const PGCA_ACCOUNTS: Account[] = [
  // ── CLASSE 1 — MEIOS FIXOS E INVESTIMENTOS ───────────────────────────
  { code: "1",         name: "Meios fixos e investimentos",                                type: "classe",     nature: "devedora", classe: 1, locked: true },
  { code: "11",        name: "Imobilizações Corpóreas",                                    type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      locked: true },
  { code: "11.1",      name: "Terrenos e recursos naturais",                               type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.1.1",    name: "Terrenos em bruto",                                          type: "movimento",  nature: "devedora", classe: 1, parent: "11.1",   locked: true },
  { code: "11.1.2",    name: "Terrenos com arranjos",                                      type: "movimento",  nature: "devedora", classe: 1, parent: "11.1",   locked: true },
  { code: "11.1.3",    name: "Subsolos",                                                   type: "movimento",  nature: "devedora", classe: 1, parent: "11.1",   locked: true },
  { code: "11.1.4",    name: "Terrenos com edifícios",                                     type: "acumulacao", nature: "devedora", classe: 1, parent: "11.1",   locked: true },
  { code: "11.1.4.1",  name: "Relativos a edifícios industriais",                         type: "movimento",  nature: "devedora", classe: 1, parent: "11.1.4", locked: true },
  { code: "11.1.4.2",  name: "Relativos a edifícios administrativos e comerciais",        type: "movimento",  nature: "devedora", classe: 1, parent: "11.1.4", locked: true },
  { code: "11.1.4.3",  name: "Relativos a outros edifícios",                              type: "movimento",  nature: "devedora", classe: 1, parent: "11.1.4", locked: true },
  { code: "11.2",      name: "Edifícios e outras construções",                             type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.2.1",    name: "Edifícios",                                                  type: "acumulacao", nature: "devedora", classe: 1, parent: "11.2",   locked: true },
  { code: "11.2.1.1",  name: "Integrados em conjuntos industriais",                       type: "movimento",  nature: "devedora", classe: 1, parent: "11.2.1", locked: true },
  { code: "11.2.1.2",  name: "Integrados em conjuntos administrativos e comerciais",      type: "movimento",  nature: "devedora", classe: 1, parent: "11.2.1", locked: true },
  { code: "11.2.1.3",  name: "Outros conjuntos industriais",                              type: "movimento",  nature: "devedora", classe: 1, parent: "11.2.1", locked: true },
  { code: "11.2.1.4",  name: "Implantados em propriedade alheia",                        type: "movimento",  nature: "devedora", classe: 1, parent: "11.2.1", locked: true },
  { code: "11.2.2",    name: "Outras construções",                                        type: "movimento",  nature: "devedora", classe: 1, parent: "11.2",   locked: true },
  { code: "11.2.3",    name: "Instalações",                                               type: "movimento",  nature: "devedora", classe: 1, parent: "11.2",   locked: true },
  { code: "11.3",      name: "Equipamento básico",                                        type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.3.1",    name: "Material industrial",                                       type: "movimento",  nature: "devedora", classe: 1, parent: "11.3",   locked: true },
  { code: "11.3.2",    name: "Ferramentas industriais",                                   type: "movimento",  nature: "devedora", classe: 1, parent: "11.3",   locked: true },
  { code: "11.3.3",    name: "Melhoramentos em equipamentos básicos",                     type: "movimento",  nature: "devedora", classe: 1, parent: "11.3",   locked: true },
  { code: "11.4",      name: "Equipamento de carga e transporte",                         type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.4.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "11.4",   isCustom: true },
  { code: "11.5",      name: "Equipamento administrativo",                                type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.5.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "11.5",   isCustom: true },
  { code: "11.6",      name: "Taras e vasilhame",                                         type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.6.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "11.6",   isCustom: true },
  { code: "11.9",      name: "Outras imobilizações corpóreas",                            type: "acumulacao", nature: "devedora", classe: 1, parent: "11",     locked: true },
  { code: "11.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "11.9",   isCustom: true },
  { code: "12",        name: "Imobilizações Incorpóreas",                                 type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      locked: true },
  { code: "12.1",      name: "Trespasses",                                                type: "acumulacao", nature: "devedora", classe: 1, parent: "12",     locked: true },
  { code: "12.1.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "12.1",   isCustom: true },
  { code: "12.2",      name: "Despesas de investigação e desenvolvimento",                type: "acumulacao", nature: "devedora", classe: 1, parent: "12",     locked: true },
  { code: "12.2.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "12.2",   isCustom: true },
  { code: "12.3",      name: "Propriedade industrial e outros direitos e contratos",      type: "acumulacao", nature: "devedora", classe: 1, parent: "12",     locked: true },
  { code: "12.3.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "12.3",   isCustom: true },
  { code: "12.4",      name: "Despesas de constituição",                                  type: "acumulacao", nature: "devedora", classe: 1, parent: "12",     locked: true },
  { code: "12.4.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "12.4",   isCustom: true },
  { code: "12.9",      name: "Outras imobilizações incorpóreas",                          type: "acumulacao", nature: "devedora", classe: 1, parent: "12",     locked: true },
  { code: "12.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "12.9",   isCustom: true },
  { code: "13",        name: "Investimentos Financeiros",                                 type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      locked: true },
  { code: "13.1",      name: "Empresas subsidiárias",                                    type: "acumulacao", nature: "devedora", classe: 1, parent: "13",     locked: true },
  { code: "13.1.1",    name: "Partes de capital",                                         type: "movimento",  nature: "devedora", classe: 1, parent: "13.1",   locked: true },
  { code: "13.1.2",    name: "Obrigações e títulos de participação",                      type: "movimento",  nature: "devedora", classe: 1, parent: "13.1",   locked: true },
  { code: "13.1.3",    name: "Empréstimos",                                               type: "movimento",  nature: "devedora", classe: 1, parent: "13.1",   locked: true },
  { code: "13.2",      name: "Empresas associadas",                                       type: "acumulacao", nature: "devedora", classe: 1, parent: "13",     locked: true },
  { code: "13.2.1",    name: "Partes de capital",                                         type: "movimento",  nature: "devedora", classe: 1, parent: "13.2",   locked: true },
  { code: "13.2.2",    name: "Obrigações e títulos de participação",                      type: "movimento",  nature: "devedora", classe: 1, parent: "13.2",   locked: true },
  { code: "13.2.3",    name: "Empréstimos",                                               type: "movimento",  nature: "devedora", classe: 1, parent: "13.2",   locked: true },
  { code: "13.3",      name: "Outras empresas",                                           type: "acumulacao", nature: "devedora", classe: 1, parent: "13",     locked: true },
  { code: "13.3.1",    name: "Partes de capital",                                         type: "movimento",  nature: "devedora", classe: 1, parent: "13.3",   locked: true },
  { code: "13.3.2",    name: "Obrigações e títulos de participação",                      type: "movimento",  nature: "devedora", classe: 1, parent: "13.3",   locked: true },
  { code: "13.3.3",    name: "Empréstimos",                                               type: "movimento",  nature: "devedora", classe: 1, parent: "13.3",   locked: true },
  { code: "13.4",      name: "Investimentos em imóveis",                                  type: "acumulacao", nature: "devedora", classe: 1, parent: "13",     locked: true },
  { code: "13.4.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "13.4",   isCustom: true },
  { code: "13.5",      name: "Fundos",                                                    type: "acumulacao", nature: "devedora", classe: 1, parent: "13",     locked: true },
  { code: "13.5.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "13.5",   isCustom: true },
  { code: "13.9",      name: "Outros investimentos financeiros",                          type: "acumulacao", nature: "devedora", classe: 1, parent: "13",     locked: true },
  { code: "13.9.1",    name: "Diamantes",                                                 type: "movimento",  nature: "devedora", classe: 1, parent: "13.9",   locked: true },
  { code: "13.9.2",    name: "Ouro",                                                      type: "movimento",  nature: "devedora", classe: 1, parent: "13.9",   locked: true },
  { code: "13.9.3",    name: "Depósitos bancários",                                       type: "movimento",  nature: "devedora", classe: 1, parent: "13.9",   locked: true },
  { code: "14",        name: "Imobilizações em Curso",                                    type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      locked: true },
  { code: "14.1",      name: "Obra em curso",                                             type: "movimento",  nature: "devedora", classe: 1, parent: "14",     locked: true },
  { code: "14.2",      name: "Obra em curso",                                             type: "movimento",  nature: "devedora", classe: 1, parent: "14",     locked: true },
  { code: "14.7",      name: "Adiantamentos por conta de imobilizado corpóreo",           type: "acumulacao", nature: "devedora", classe: 1, parent: "14",     locked: true },
  { code: "14.7.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "14.7",   isCustom: true },
  { code: "14.8",      name: "Adiantamentos por conta de imobilizado incorpóreo",         type: "acumulacao", nature: "devedora", classe: 1, parent: "14",     locked: true },
  { code: "14.8.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "14.8",   isCustom: true },
  { code: "14.9",      name: "Adiantamentos por conta de investimentos financeiros",      type: "acumulacao", nature: "devedora", classe: 1, parent: "14",     locked: true },
  { code: "14.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 1, parent: "14.9",   isCustom: true },
  { code: "15",        name: "Conta livre / a desenvolver",                               type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      isCustom: true },
  { code: "16",        name: "Conta livre / a desenvolver",                               type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      isCustom: true },
  { code: "17",        name: "Conta livre / a desenvolver",                               type: "acumulacao", nature: "devedora", classe: 1, parent: "1",      isCustom: true },
  { code: "18",        name: "Amortizações Acumuladas",                                   type: "acumulacao", nature: "credora",  classe: 1, parent: "1",      locked: true },
  { code: "18.1",      name: "Imobilizações corpóreas",                                   type: "acumulacao", nature: "credora",  classe: 1, parent: "18",     locked: true },
  { code: "18.1.1",    name: "Terrenos e recursos naturais",                              type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.1.2",    name: "Edifícios e outras construções",                            type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.1.3",    name: "Equipamento básico",                                        type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.1.4",    name: "Equipamento de carga e transporte",                         type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.1.5",    name: "Equipamento administrativo",                                type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.1.6",    name: "Taras e vasilhame",                                         type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.1.9",    name: "Outras imobilizações corpóreas",                            type: "movimento",  nature: "credora",  classe: 1, parent: "18.1",   locked: true },
  { code: "18.2",      name: "Imobilizações incorpóreas",                                 type: "acumulacao", nature: "credora",  classe: 1, parent: "18",     locked: true },
  { code: "18.2.1",    name: "Trespasses",                                                type: "movimento",  nature: "credora",  classe: 1, parent: "18.2",   locked: true },
  { code: "18.2.2",    name: "Despesas de investigação e desenvolvimento",                type: "movimento",  nature: "credora",  classe: 1, parent: "18.2",   locked: true },
  { code: "18.2.3",    name: "Propriedade industrial e outros direitos e contratos",      type: "movimento",  nature: "credora",  classe: 1, parent: "18.2",   locked: true },
  { code: "18.2.4",    name: "Despesas de constituição",                                  type: "movimento",  nature: "credora",  classe: 1, parent: "18.2",   locked: true },
  { code: "18.2.9",    name: "Outras imobilizações incorpóreas",                          type: "movimento",  nature: "credora",  classe: 1, parent: "18.2",   locked: true },
  { code: "18.3",      name: "Investimentos financeiros em imóveis",                      type: "acumulacao", nature: "credora",  classe: 1, parent: "18",     locked: true },
  { code: "18.3.1",    name: "Terrenos e recursos naturais",                              type: "movimento",  nature: "credora",  classe: 1, parent: "18.3",   locked: true },
  { code: "18.3.2",    name: "Edifícios e outras construções",                            type: "movimento",  nature: "credora",  classe: 1, parent: "18.3",   locked: true },
  { code: "19",        name: "Provisões para Investimentos Financeiros",                  type: "acumulacao", nature: "credora",  classe: 1, parent: "1",      locked: true },
  { code: "19.1",      name: "Empresas subsidiárias",                                    type: "acumulacao", nature: "credora",  classe: 1, parent: "19",     locked: true },
  { code: "19.1.1",    name: "Partes de capital",                                         type: "movimento",  nature: "credora",  classe: 1, parent: "19.1",   locked: true },
  { code: "19.1.2",    name: "Obrigações e títulos de participação",                      type: "movimento",  nature: "credora",  classe: 1, parent: "19.1",   locked: true },
  { code: "19.1.3",    name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 1, parent: "19.1",   locked: true },
  { code: "19.2",      name: "Empresas associadas",                                       type: "acumulacao", nature: "credora",  classe: 1, parent: "19",     locked: true },
  { code: "19.2.1",    name: "Partes de capital",                                         type: "movimento",  nature: "credora",  classe: 1, parent: "19.2",   locked: true },
  { code: "19.2.2",    name: "Obrigações e títulos de participação",                      type: "movimento",  nature: "credora",  classe: 1, parent: "19.2",   locked: true },
  { code: "19.2.3",    name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 1, parent: "19.2",   locked: true },
  { code: "19.3",      name: "Outras empresas",                                           type: "acumulacao", nature: "credora",  classe: 1, parent: "19",     locked: true },
  { code: "19.3.1",    name: "Partes de capital",                                         type: "movimento",  nature: "credora",  classe: 1, parent: "19.3",   locked: true },
  { code: "19.3.2",    name: "Obrigações e títulos de participação",                      type: "movimento",  nature: "credora",  classe: 1, parent: "19.3",   locked: true },
  { code: "19.3.3",    name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 1, parent: "19.3",   locked: true },
  { code: "19.4",      name: "Fundos",                                                    type: "acumulacao", nature: "credora",  classe: 1, parent: "19",     locked: true },
  { code: "19.4.1",    name: "Partes de capital",                                         type: "movimento",  nature: "credora",  classe: 1, parent: "19.4",   locked: true },
  { code: "19.9",      name: "Outros investimentos financeiros",                          type: "acumulacao", nature: "credora",  classe: 1, parent: "19",     locked: true },
  { code: "19.9.1",    name: "Diamantes",                                                 type: "movimento",  nature: "credora",  classe: 1, parent: "19.9",   locked: true },
  { code: "19.9.2",    name: "Ouro",                                                      type: "movimento",  nature: "credora",  classe: 1, parent: "19.9",   locked: true },
  { code: "19.9.3",    name: "Depósitos bancários",                                       type: "movimento",  nature: "credora",  classe: 1, parent: "19.9",   locked: true },


  // ── CLASSE 2 — EXISTÊNCIAS ────────────────────────────────────────────
  { code: "2",     name: "Existências",                                            type: "classe",     nature: "devedora", classe: 2, locked: true },
  { code: "21",    name: "Compras",                                                type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "21.1",  name: "Matérias-primas, subsidiárias e de consumo",            type: "acumulacao", nature: "devedora", classe: 2, parent: "21",   locked: true },
  { code: "21.1.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "21.1", isCustom: true },
  { code: "21.2",  name: "Mercadorias",                                            type: "acumulacao", nature: "devedora", classe: 2, parent: "21",   locked: true },
  { code: "21.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "21.2", isCustom: true },
  { code: "21.7",  name: "Devoluções de compras",                                  type: "acumulacao", nature: "credora",  classe: 2, parent: "21",   locked: true },
  { code: "21.7.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "21.7", isCustom: true },
  { code: "21.8",  name: "Descontos e abatimentos em compras",                    type: "acumulacao", nature: "credora",  classe: 2, parent: "21",   locked: true },
  { code: "21.8.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "21.8", isCustom: true },
  { code: "21.9",  name: "Conta livre / a desenvolver",                           type: "acumulacao", nature: "devedora", classe: 2, parent: "21",   isCustom: true },
  { code: "21.9.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "21.9", isCustom: true },
  { code: "22",    name: "Matérias-primas, Subsidiárias e de Consumo",            type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "22.1",  name: "Matérias-primas",                                       type: "acumulacao", nature: "devedora", classe: 2, parent: "22",   locked: true },
  { code: "22.1.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "22.1", isCustom: true },
  { code: "22.2",  name: "Matérias subsidiárias",                                 type: "acumulacao", nature: "devedora", classe: 2, parent: "22",   locked: true },
  { code: "22.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "22.2", isCustom: true },
  { code: "22.3",  name: "Materiais diversos",                                    type: "acumulacao", nature: "devedora", classe: 2, parent: "22",   locked: true },
  { code: "22.3.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "22.3", isCustom: true },
  { code: "22.4",  name: "Embalagens de consumo",                                 type: "acumulacao", nature: "devedora", classe: 2, parent: "22",   locked: true },
  { code: "22.4.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "22.4", isCustom: true },
  { code: "22.5",  name: "Outros materiais",                                      type: "acumulacao", nature: "devedora", classe: 2, parent: "22",   locked: true },
  { code: "22.5.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "22.5", isCustom: true },
  { code: "23",    name: "Produtos e Trabalhos em Curso",                         type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "23.1",  name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "23",   isCustom: true },
  { code: "23.2",  name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "23",   isCustom: true },
  { code: "24",    name: "Produtos Acabados e Intermédios",                       type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "24.1",  name: "Produtos acabados",                                     type: "acumulacao", nature: "devedora", classe: 2, parent: "24",   locked: true },
  { code: "24.1.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "24.1", isCustom: true },
  { code: "24.2",  name: "Produtos intermédios",                                  type: "acumulacao", nature: "devedora", classe: 2, parent: "24",   locked: true },
  { code: "24.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "24.2", isCustom: true },
  { code: "24.9",  name: "Em poder de terceiros",                                 type: "acumulacao", nature: "devedora", classe: 2, parent: "24",   locked: true },
  { code: "24.9.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "24.9", isCustom: true },
  { code: "25",    name: "Sub-produtos, Desperdícios, Resíduos e Refugos",        type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "25.1",  name: "Sub-produtos",                                          type: "acumulacao", nature: "devedora", classe: 2, parent: "25",   locked: true },
  { code: "25.1.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "25.1", isCustom: true },
  { code: "25.2",  name: "Desperdícios, resíduos e refugos",                      type: "acumulacao", nature: "devedora", classe: 2, parent: "25",   locked: true },
  { code: "25.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "25.2", isCustom: true },
  { code: "26",    name: "Mercadorias",                                            type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "26.1",  name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "26",   isCustom: true },
  { code: "26.2",  name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "26",   isCustom: true },
  { code: "26.9",  name: "Em poder de terceiros",                                 type: "acumulacao", nature: "devedora", classe: 2, parent: "26",   locked: true },
  { code: "26.9.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "26.9", isCustom: true },
  { code: "27",    name: "Matérias-primas, Mercadorias e Outros Materiais em Trânsito", type: "acumulacao", nature: "devedora", classe: 2, parent: "2", locked: true },
  { code: "27.1",  name: "Matérias-primas",                                       type: "acumulacao", nature: "devedora", classe: 2, parent: "27",   locked: true },
  { code: "27.1.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "27.1", isCustom: true },
  { code: "27.2",  name: "Outros materiais",                                      type: "acumulacao", nature: "devedora", classe: 2, parent: "27",   locked: true },
  { code: "27.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "27.2", isCustom: true },
  { code: "27.3",  name: "Mercadorias",                                           type: "acumulacao", nature: "devedora", classe: 2, parent: "27",   locked: true },
  { code: "27.3.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "27.3", isCustom: true },
  { code: "28",    name: "Adiantamentos por Conta de Compras",                    type: "acumulacao", nature: "devedora", classe: 2, parent: "2",    locked: true },
  { code: "28.1",  name: "Matérias-primas e outros materiais",                    type: "acumulacao", nature: "devedora", classe: 2, parent: "28",   locked: true },
  { code: "28.1.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "28.1", isCustom: true },
  { code: "28.2",  name: "Mercadorias",                                           type: "acumulacao", nature: "devedora", classe: 2, parent: "28",   locked: true },
  { code: "28.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 2, parent: "28.2", isCustom: true },
  { code: "29",    name: "Provisão para Depreciação de Existências",              type: "acumulacao", nature: "credora",  classe: 2, parent: "2",    locked: true },
  { code: "29.1",  name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "29",   isCustom: true },
  { code: "29.2",  name: "Matérias-primas subsidiárias e de consumo",             type: "acumulacao", nature: "credora",  classe: 2, parent: "29",   locked: true },
  { code: "29.2.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "29.2", isCustom: true },
  { code: "29.3",  name: "Produtos e trabalhos em curso",                         type: "acumulacao", nature: "credora",  classe: 2, parent: "29",   locked: true },
  { code: "29.3.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "29.3", isCustom: true },
  { code: "29.4",  name: "Produtos acabados e intermédios",                       type: "acumulacao", nature: "credora",  classe: 2, parent: "29",   locked: true },
  { code: "29.4.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "29.4", isCustom: true },
  { code: "29.5",  name: "Sub-produtos, desperdícios, resíduos e refugos",        type: "acumulacao", nature: "credora",  classe: 2, parent: "29",   locked: true },
  { code: "29.5.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "29.5", isCustom: true },
  { code: "29.6",  name: "Mercadorias",                                           type: "acumulacao", nature: "credora",  classe: 2, parent: "29",   locked: true },
  { code: "29.6.1",name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 2, parent: "29.6", isCustom: true },

  // ── CLASSE 3 — TERCEIROS ─────────────────────────────────────────────
  { code: "3",         name: "Terceiros",                                                  type: "classe",     nature: "devedora", classe: 3, locked: true },
  { code: "31",        name: "Clientes",                                                   type: "acumulacao", nature: "devedora", classe: 3, parent: "3",       locked: true },
  { code: "31.1",      name: "Clientes — correntes",                                       type: "acumulacao", nature: "devedora", classe: 3, parent: "31",      locked: true },
  { code: "31.1.1",    name: "Grupo",                                                      type: "acumulacao", nature: "devedora", classe: 3, parent: "31.1",    locked: true },
  { code: "31.1.1.1",  name: "Subsidiárias",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "31.1.1",  locked: true },
  { code: "31.1.1.2",  name: "Associadas",                                                type: "movimento",  nature: "devedora", classe: 3, parent: "31.1.1",  locked: true },
  { code: "31.1.2",    name: "Não grupo",                                                  type: "acumulacao", nature: "devedora", classe: 3, parent: "31.1",    locked: true },
  { code: "31.1.2.1",  name: "Nacionais",                                                 type: "movimento",  nature: "devedora", classe: 3, parent: "31.1.2",  locked: true },
  { code: "31.1.2.2",  name: "Estrangeiros",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "31.1.2",  locked: true },
  { code: "31.2",      name: "Clientes — títulos a receber",                              type: "acumulacao", nature: "devedora", classe: 3, parent: "31",      locked: true },
  { code: "31.2.1",    name: "Grupo",                                                      type: "acumulacao", nature: "devedora", classe: 3, parent: "31.2",    locked: true },
  { code: "31.2.1.1",  name: "Subsidiárias",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "31.2.1",  locked: true },
  { code: "31.2.1.2",  name: "Associadas",                                                type: "movimento",  nature: "devedora", classe: 3, parent: "31.2.1",  locked: true },
  { code: "31.2.2",    name: "Não grupo",                                                  type: "acumulacao", nature: "devedora", classe: 3, parent: "31.2",    locked: true },
  { code: "31.2.2.1",  name: "Nacionais",                                                 type: "movimento",  nature: "devedora", classe: 3, parent: "31.2.2",  locked: true },
  { code: "31.2.2.2",  name: "Estrangeiros",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "31.2.2",  locked: true },
  { code: "31.3",      name: "Clientes — títulos descontados",                            type: "acumulacao", nature: "devedora", classe: 3, parent: "31",      locked: true },
  { code: "31.3.1",    name: "Grupo",                                                      type: "acumulacao", nature: "devedora", classe: 3, parent: "31.3",    locked: true },
  { code: "31.3.1.1",  name: "Subsidiárias",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "31.3.1",  locked: true },
  { code: "31.3.1.2",  name: "Associadas",                                                type: "movimento",  nature: "devedora", classe: 3, parent: "31.3.1",  locked: true },
  { code: "31.3.2",    name: "Não grupo",                                                  type: "acumulacao", nature: "devedora", classe: 3, parent: "31.3",    locked: true },
  { code: "31.3.2.1",  name: "Nacionais",                                                 type: "movimento",  nature: "devedora", classe: 3, parent: "31.3.2",  locked: true },
  { code: "31.3.2.2",  name: "Estrangeiros",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "31.3.2",  locked: true },
  { code: "31.8",      name: "Clientes de cobrança duvidosa",                             type: "acumulacao", nature: "devedora", classe: 3, parent: "31",      locked: true },
  { code: "31.8.1",    name: "Clientes — correntes",                                      type: "movimento",  nature: "devedora", classe: 3, parent: "31.8",    locked: true },
  { code: "31.8.2",    name: "Clientes — títulos",                                        type: "movimento",  nature: "devedora", classe: 3, parent: "31.8",    locked: true },
  { code: "31.9",      name: "Clientes — saldos credores",                                type: "acumulacao", nature: "credora",  classe: 3, parent: "31",      locked: true },
  { code: "31.9.1",    name: "Adiantamentos",                                             type: "movimento",  nature: "credora",  classe: 3, parent: "31.9",    locked: true },
  { code: "31.9.2",    name: "Embalagens a devolver",                                     type: "movimento",  nature: "credora",  classe: 3, parent: "31.9",    locked: true },
  { code: "31.9.3",    name: "Material à consignação",                                    type: "movimento",  nature: "credora",  classe: 3, parent: "31.9",    locked: true },
  { code: "32",        name: "Fornecedores",                                              type: "acumulacao", nature: "credora",  classe: 3, parent: "3",       locked: true },
  { code: "32.1",      name: "Fornecedores — correntes",                                  type: "acumulacao", nature: "credora",  classe: 3, parent: "32",      locked: true },
  { code: "32.1.1",    name: "Grupo",                                                      type: "acumulacao", nature: "credora",  classe: 3, parent: "32.1",    locked: true },
  { code: "32.1.1.1",  name: "Subsidiárias",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "32.1.1",  locked: true },
  { code: "32.1.1.2",  name: "Associadas",                                                type: "movimento",  nature: "credora",  classe: 3, parent: "32.1.1",  locked: true },
  { code: "32.1.2",    name: "Não grupo",                                                  type: "acumulacao", nature: "credora",  classe: 3, parent: "32.1",    locked: true },
  { code: "32.1.2.1",  name: "Nacionais",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "32.1.2",  locked: true },
  { code: "32.1.2.2",  name: "Estrangeiros",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "32.1.2",  locked: true },
  { code: "32.2",      name: "Fornecedores — títulos a pagar",                            type: "acumulacao", nature: "credora",  classe: 3, parent: "32",      locked: true },
  { code: "32.2.1",    name: "Grupo",                                                      type: "acumulacao", nature: "credora",  classe: 3, parent: "32.2",    locked: true },
  { code: "32.2.1.1",  name: "Subsidiárias",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "32.2.1",  locked: true },
  { code: "32.2.1.2",  name: "Associadas",                                                type: "movimento",  nature: "credora",  classe: 3, parent: "32.2.1",  locked: true },
  { code: "32.2.2",    name: "Não grupo",                                                  type: "acumulacao", nature: "credora",  classe: 3, parent: "32.2",    locked: true },
  { code: "32.2.2.1",  name: "Nacionais",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "32.2.2",  locked: true },
  { code: "32.2.2.2",  name: "Estrangeiros",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "32.2.2",  locked: true },
  { code: "32.8",      name: "Fornecedores — facturas em recepção e conferência",         type: "movimento",  nature: "credora",  classe: 3, parent: "32",      locked: true },
  { code: "32.9",      name: "Fornecedores — saldos devedores",                           type: "acumulacao", nature: "devedora", classe: 3, parent: "32",      locked: true },
  { code: "32.9.1",    name: "Adiantamentos",                                             type: "movimento",  nature: "devedora", classe: 3, parent: "32.9",    locked: true },
  { code: "32.9.2",    name: "Embalagens a devolver",                                     type: "movimento",  nature: "devedora", classe: 3, parent: "32.9",    locked: true },
  { code: "32.9.3",    name: "Material à consignação",                                    type: "movimento",  nature: "devedora", classe: 3, parent: "32.9",    locked: true },
  { code: "33",        name: "Empréstimos",                                               type: "acumulacao", nature: "credora",  classe: 3, parent: "3",       locked: true },
  { code: "33.1",      name: "Empréstimos bancários",                                     type: "acumulacao", nature: "credora",  classe: 3, parent: "33",      locked: true },
  { code: "33.1.1",    name: "Moeda nacional",                                            type: "acumulacao", nature: "credora",  classe: 3, parent: "33.1",    locked: true },
  { code: "33.1.1.1",  name: "Banco ___",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "33.1.1",  isCustom: true },
  { code: "33.1.2",    name: "Moeda estrangeira",                                         type: "acumulacao", nature: "credora",  classe: 3, parent: "33.1",    locked: true },
  { code: "33.1.2.1",  name: "Banco ___",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "33.1.2",  isCustom: true },
  { code: "33.2",      name: "Empréstimos por obrigações",                                type: "acumulacao", nature: "credora",  classe: 3, parent: "33",      locked: true },
  { code: "33.2.1",    name: "Convertíveis",                                              type: "acumulacao", nature: "credora",  classe: 3, parent: "33.2",    locked: true },
  { code: "33.2.1.1",  name: "Entidade ___",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "33.2.1",  isCustom: true },
  { code: "33.2.2",    name: "Não convertíveis",                                          type: "acumulacao", nature: "credora",  classe: 3, parent: "33.2",    locked: true },
  { code: "33.2.2.1",  name: "Entidade ___",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "33.2.2",  isCustom: true },
  { code: "33.3",      name: "Empréstimos por títulos de participação",                   type: "acumulacao", nature: "credora",  classe: 3, parent: "33",      locked: true },
  { code: "33.3.1",    name: "Entidade ___",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "33.3",    isCustom: true },
  { code: "33.9",      name: "Outros empréstimos obtidos",                                type: "acumulacao", nature: "credora",  classe: 3, parent: "33",      locked: true },
  { code: "33.9.1",    name: "Entidade ___",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "33.9",    isCustom: true },
  { code: "34",        name: "Estado",                                                    type: "acumulacao", nature: "credora",  classe: 3, parent: "3",       locked: true },
  { code: "34.1",      name: "Imposto sobre os lucros",                                   type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      locked: true },
  { code: "34.1.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "34.1",    isCustom: true },
  { code: "34.2",      name: "Imposto de produção e consumo",                             type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      locked: true },
  { code: "34.2.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "34.2",    isCustom: true },
  { code: "34.3",      name: "Imposto de rendimento de trabalho",                         type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      locked: true },
  { code: "34.3.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "34.3",    isCustom: true },
  { code: "34.4",      name: "Imposto de circulação",                                     type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      locked: true },
  { code: "34.4.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "34.4",    isCustom: true },
  { code: "34.5",      name: "IVA — Imposto sobre o Valor Acrescentado",                  type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      iva: true, locked: true },
  { code: "34.5.1",    name: "IVA suportado",                                             type: "acumulacao", nature: "devedora", classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.1.1",  name: "Existências",                                               type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.1",  iva: true, locked: true },
  { code: "34.5.1.2",  name: "Meios fixos e investimentos",                               type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.1",  iva: true, locked: true },
  { code: "34.5.1.3",  name: "Outros bens e serviços",                                    type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.1",  iva: true, locked: true },
  { code: "34.5.2",    name: "IVA dedutível",                                             type: "acumulacao", nature: "devedora", classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.2.1",  name: "Existências",                                               type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.2",  iva: true, locked: true },
  { code: "34.5.2.2",  name: "Meios fixos e investimentos",                               type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.2",  iva: true, locked: true },
  { code: "34.5.2.3",  name: "Outros bens e serviços",                                    type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.2",  iva: true, locked: true },
  { code: "34.5.3",    name: "IVA liquidado",                                             type: "acumulacao", nature: "credora",  classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.3.1",  name: "Operações gerais",                                          type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.3",  iva: true, locked: true },
  { code: "34.5.3.2",  name: "Operações abrangidas pelo regime de IVA de caixa",          type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.3",  iva: true, locked: true },
  { code: "34.5.3.3",  name: "Autoconsumo e operações gratuitas",                         type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.3",  iva: true, locked: true },
  { code: "34.5.3.4",  name: "Operações especiais",                                       type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.3",  iva: true, locked: true },
  { code: "34.5.4",    name: "IVA regularizações",                                        type: "acumulacao", nature: "credora",  classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.4.1",  name: "Mensais a favor do sujeito passivo",                        type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.4",  iva: true, locked: true },
  { code: "34.5.4.2",  name: "Mensais a favor do Estado",                                 type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.4",  iva: true, locked: true },
  { code: "34.5.4.3",  name: "Anual por cálculo do pró rata definitivo",                  type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.4",  iva: true, locked: true },
  { code: "34.5.4.4",  name: "Outras regularizações anuais",                              type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.4",  iva: true, locked: true },
  { code: "34.5.5",    name: "IVA apuramento",                                            type: "acumulacao", nature: "credora",  classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.5.1",  name: "Apuramento do regime de IVA normal",                        type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.5",  iva: true, locked: true },
  { code: "34.5.5.2",  name: "Apuramento do regime de IVA de caixa",                      type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.5",  iva: true, locked: true },
  { code: "34.5.6",    name: "IVA a pagar",                                               type: "acumulacao", nature: "credora",  classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.6.1",  name: "IVA a pagar de apuramento",                                 type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.6",  iva: true, locked: true },
  { code: "34.5.6.2",  name: "IVA a pagar de cativo",                                     type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.6",  iva: true, locked: true },
  { code: "34.5.6.3",  name: "IVA a pagar de liquidações oficiosas",                      type: "movimento",  nature: "credora",  classe: 3, parent: "34.5.6",  iva: true, locked: true },
  { code: "34.5.7",    name: "IVA a recuperar",                                           type: "acumulacao", nature: "devedora", classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.7.1",  name: "IVA a recuperar de apuramentos",                            type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.7",  iva: true, locked: true },
  { code: "34.5.7.2",  name: "IVA a recuperar de cativo",                                 type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.7",  iva: true, locked: true },
  { code: "34.5.8",    name: "IVA reembolsos pedidos",                                    type: "acumulacao", nature: "devedora", classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.5.8.1",  name: "Reembolsos pedidos",                                        type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.8",  iva: true, locked: true },
  { code: "34.5.8.2",  name: "Reembolsos deferidos",                                      type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.8",  iva: true, locked: true },
  { code: "34.5.8.3",  name: "Reembolsos indeferidos",                                    type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.8",  iva: true, locked: true },
  { code: "34.5.8.4",  name: "Reembolsos reclamados, recorridos ou impugnados",           type: "movimento",  nature: "devedora", classe: 3, parent: "34.5.8",  iva: true, locked: true },
  { code: "34.5.9",    name: "IVA liquidações oficiosas",                                 type: "movimento",  nature: "credora",  classe: 3, parent: "34.5",    iva: true, locked: true },
  { code: "34.6",      name: "Certificado de crédito fiscal a compensar",                 type: "movimento",  nature: "devedora", classe: 3, parent: "34",      locked: true },
  { code: "34.8",      name: "Subsídios a preços",                                        type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      locked: true },
  { code: "34.8.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "34.8",    isCustom: true },
  { code: "34.9",      name: "Outros impostos",                                           type: "acumulacao", nature: "credora",  classe: 3, parent: "34",      locked: true },
  { code: "34.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "34.9",    isCustom: true },
  { code: "35",        name: "Entidades Participantes e Participadas",                    type: "acumulacao", nature: "devedora", classe: 3, parent: "3",       locked: true },
  { code: "35.1",      name: "Entidades participantes",                                   type: "acumulacao", nature: "devedora", classe: 3, parent: "35",      locked: true },
  { code: "35.1.1",    name: "Estado",                                                    type: "acumulacao", nature: "devedora", classe: 3, parent: "35.1",    locked: true },
  { code: "35.1.1.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.1",  locked: true },
  { code: "35.1.1.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.1",  locked: true },
  { code: "35.1.1.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.1",  locked: true },
  { code: "35.1.1.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.1.1",  locked: true },
  { code: "35.1.2",    name: "Empresas do grupo — subsidiárias",                          type: "acumulacao", nature: "devedora", classe: 3, parent: "35.1",    locked: true },
  { code: "35.1.2.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.2",  locked: true },
  { code: "35.1.2.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.2",  locked: true },
  { code: "35.1.2.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.2",  locked: true },
  { code: "35.1.2.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.1.2",  locked: true },
  { code: "35.1.3",    name: "Empresas do grupo — associadas",                            type: "acumulacao", nature: "devedora", classe: 3, parent: "35.1",    locked: true },
  { code: "35.1.3.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.3",  locked: true },
  { code: "35.1.3.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.3",  locked: true },
  { code: "35.1.3.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.3",  locked: true },
  { code: "35.1.3.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.1.3",  locked: true },
  { code: "35.1.4",    name: "Outros",                                                    type: "acumulacao", nature: "devedora", classe: 3, parent: "35.1",    locked: true },
  { code: "35.1.4.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.4",  locked: true },
  { code: "35.1.4.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.4",  locked: true },
  { code: "35.1.4.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.1.4",  locked: true },
  { code: "35.1.4.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.1.4",  locked: true },
  { code: "35.2",      name: "Entidades participadas",                                    type: "acumulacao", nature: "devedora", classe: 3, parent: "35",      locked: true },
  { code: "35.2.1",    name: "Estado",                                                    type: "acumulacao", nature: "devedora", classe: 3, parent: "35.2",    locked: true },
  { code: "35.2.1.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.1",  locked: true },
  { code: "35.2.1.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.1",  locked: true },
  { code: "35.2.1.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.1",  locked: true },
  { code: "35.2.1.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.2.1",  locked: true },
  { code: "35.2.2",    name: "Empresas do grupo — subsidiárias",                          type: "acumulacao", nature: "devedora", classe: 3, parent: "35.2",    locked: true },
  { code: "35.2.2.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.2",  locked: true },
  { code: "35.2.2.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.2",  locked: true },
  { code: "35.2.2.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.2",  locked: true },
  { code: "35.2.2.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.2.2",  locked: true },
  { code: "35.2.3",    name: "Empresas do grupo — associadas",                            type: "acumulacao", nature: "devedora", classe: 3, parent: "35.2",    locked: true },
  { code: "35.2.3.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.3",  locked: true },
  { code: "35.2.3.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.3",  locked: true },
  { code: "35.2.3.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.3",  locked: true },
  { code: "35.2.3.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.2.3",  locked: true },
  { code: "35.2.4",    name: "Outros",                                                    type: "acumulacao", nature: "devedora", classe: 3, parent: "35.2",    locked: true },
  { code: "35.2.4.1",  name: "c/subscrição",                                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.4",  locked: true },
  { code: "35.2.4.2",  name: "c/adiantamentos sobre lucros",                              type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.4",  locked: true },
  { code: "35.2.4.3",  name: "c/lucros",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "35.2.4",  locked: true },
  { code: "35.2.4.4",  name: "Empréstimos",                                               type: "movimento",  nature: "credora",  classe: 3, parent: "35.2.4",  locked: true },
  { code: "36",        name: "Pessoal",                                                   type: "acumulacao", nature: "credora",  classe: 3, parent: "3",       locked: true },
  { code: "36.1",      name: "Pessoal — remunerações",                                    type: "acumulacao", nature: "credora",  classe: 3, parent: "36",      locked: true },
  { code: "36.1.1",    name: "Órgãos sociais",                                            type: "acumulacao", nature: "credora",  classe: 3, parent: "36.1",    locked: true },
  { code: "36.1.1.1",  name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "36.1.1",  isCustom: true },
  { code: "36.1.2",    name: "Empregados",                                                type: "acumulacao", nature: "credora",  classe: 3, parent: "36.1",    locked: true },
  { code: "36.1.2.1",  name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "36.1.2",  isCustom: true },
  { code: "36.2",      name: "Pessoal — participação nos resultados",                     type: "acumulacao", nature: "credora",  classe: 3, parent: "36",      locked: true },
  { code: "36.2.1",    name: "Órgãos sociais",                                            type: "acumulacao", nature: "credora",  classe: 3, parent: "36.2",    locked: true },
  { code: "36.2.1.1",  name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "36.2.1",  isCustom: true },
  { code: "36.2.2",    name: "Empregados",                                                type: "acumulacao", nature: "credora",  classe: 3, parent: "36.2",    locked: true },
  { code: "36.2.2.1",  name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "36.2.2",  isCustom: true },
  { code: "36.3",      name: "Pessoal — adiantamentos",                                   type: "acumulacao", nature: "devedora", classe: 3, parent: "36",      locked: true },
  { code: "36.3.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 3, parent: "36.3",    isCustom: true },
  { code: "36.9",      name: "Pessoal — outros",                                          type: "acumulacao", nature: "credora",  classe: 3, parent: "36",      locked: true },
  { code: "36.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "36.9",    isCustom: true },
  { code: "37",        name: "Outros Valores a Receber e a Pagar",                        type: "acumulacao", nature: "devedora", classe: 3, parent: "3",       locked: true },
  { code: "37.1",      name: "Compras de imobilizado",                                    type: "acumulacao", nature: "credora",  classe: 3, parent: "37",      locked: true },
  { code: "37.1.1",    name: "Corpóreo",                                                  type: "movimento",  nature: "credora",  classe: 3, parent: "37.1",    locked: true },
  { code: "37.1.2",    name: "Incorpóreo",                                                type: "movimento",  nature: "credora",  classe: 3, parent: "37.1",    locked: true },
  { code: "37.1.3",    name: "Financeiro",                                                type: "movimento",  nature: "credora",  classe: 3, parent: "37.1",    locked: true },
  { code: "37.2",      name: "Vendas de imobilizado",                                     type: "acumulacao", nature: "devedora", classe: 3, parent: "37",      locked: true },
  { code: "37.2.1",    name: "Corpóreo",                                                  type: "movimento",  nature: "devedora", classe: 3, parent: "37.2",    locked: true },
  { code: "37.2.2",    name: "Incorpóreo",                                                type: "movimento",  nature: "devedora", classe: 3, parent: "37.2",    locked: true },
  { code: "37.2.3",    name: "Financeiro",                                                type: "movimento",  nature: "devedora", classe: 3, parent: "37.2",    locked: true },
  { code: "37.3",      name: "Proveitos a facturar",                                      type: "acumulacao", nature: "devedora", classe: 3, parent: "37",      locked: true },
  { code: "37.3.1",    name: "Vendas",                                                    type: "movimento",  nature: "devedora", classe: 3, parent: "37.3",    locked: true },
  { code: "37.3.2",    name: "Prestações de serviço",                                     type: "movimento",  nature: "devedora", classe: 3, parent: "37.3",    locked: true },
  { code: "37.3.3",    name: "Juros",                                                     type: "movimento",  nature: "devedora", classe: 3, parent: "37.3",    locked: true },
  { code: "37.4",      name: "Encargos a repartir por períodos futuros",                  type: "acumulacao", nature: "devedora", classe: 3, parent: "37",      locked: true },
  { code: "37.4.1",    name: "Descontos de emissão de obrigações",                        type: "movimento",  nature: "devedora", classe: 3, parent: "37.4",    locked: true },
  { code: "37.4.2",    name: "Descontos de emissão de títulos de participação",           type: "movimento",  nature: "devedora", classe: 3, parent: "37.4",    locked: true },
  { code: "37.5",      name: "Encargos a pagar",                                          type: "acumulacao", nature: "credora",  classe: 3, parent: "37",      locked: true },
  { code: "37.5.1",    name: "Remunerações",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "37.5",    locked: true },
  { code: "37.5.2",    name: "Juros",                                                     type: "movimento",  nature: "credora",  classe: 3, parent: "37.5",    locked: true },
  { code: "37.6",      name: "Proveitos a repartir por períodos futuros",                 type: "acumulacao", nature: "credora",  classe: 3, parent: "37",      locked: true },
  { code: "37.6.1",    name: "Prémios de emissão de obrigações",                          type: "movimento",  nature: "credora",  classe: 3, parent: "37.6",    locked: true },
  { code: "37.6.2",    name: "Prémios de emissão de títulos de participação",             type: "movimento",  nature: "credora",  classe: 3, parent: "37.6",    locked: true },
  { code: "37.6.3",    name: "Subsídios para investimento",                               type: "movimento",  nature: "credora",  classe: 3, parent: "37.6",    locked: true },
  { code: "37.6.4",    name: "Diferenças de câmbio favoráveis reversíveis",               type: "movimento",  nature: "credora",  classe: 3, parent: "37.6",    locked: true },
  { code: "37.7",      name: "Contas transitórias",                                       type: "acumulacao", nature: "devedora", classe: 3, parent: "37",      locked: true },
  { code: "37.7.1",    name: "Transacções entre a sede e as dependências da empresa",     type: "movimento",  nature: "devedora", classe: 3, parent: "37.7",    locked: true },
  { code: "37.9",      name: "Outros valores a receber e a pagar",                        type: "acumulacao", nature: "devedora", classe: 3, parent: "37",      locked: true },
  { code: "37.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 3, parent: "37.9",    isCustom: true },
  { code: "38",        name: "Provisões para Cobranças Duvidosas",                        type: "acumulacao", nature: "credora",  classe: 3, parent: "3",       locked: true },
  { code: "38.1",      name: "Provisões para clientes",                                   type: "acumulacao", nature: "credora",  classe: 3, parent: "38",      locked: true },
  { code: "38.1.1",    name: "Clientes — correntes",                                      type: "acumulacao", nature: "credora",  classe: 3, parent: "38.1",    locked: true },
  { code: "38.1.1.1",  name: "Grupo",                                                     type: "movimento",  nature: "credora",  classe: 3, parent: "38.1.1",  locked: true },
  { code: "38.1.1.2",  name: "Não grupo",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "38.1.1",  locked: true },
  { code: "38.1.2",    name: "Clientes — títulos a receber",                              type: "acumulacao", nature: "credora",  classe: 3, parent: "38.1",    locked: true },
  { code: "38.1.2.1",  name: "Grupo",                                                     type: "movimento",  nature: "credora",  classe: 3, parent: "38.1.2",  locked: true },
  { code: "38.1.2.2",  name: "Não grupo",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "38.1.2",  locked: true },
  { code: "38.1.3",    name: "Clientes — cobrança duvidosa",                              type: "acumulacao", nature: "credora",  classe: 3, parent: "38.1",    locked: true },
  { code: "38.1.3.1",  name: "Grupo",                                                     type: "movimento",  nature: "credora",  classe: 3, parent: "38.1.3",  locked: true },
  { code: "38.1.3.2",  name: "Não grupo",                                                 type: "movimento",  nature: "credora",  classe: 3, parent: "38.1.3",  locked: true },
  { code: "38.2",      name: "Provisões para saldos devedores de fornecedores",           type: "acumulacao", nature: "credora",  classe: 3, parent: "38",      locked: true },
  { code: "38.2.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "38.2",    isCustom: true },
  { code: "38.3",      name: "Provisões para participantes e participadas",               type: "acumulacao", nature: "credora",  classe: 3, parent: "38",      locked: true },
  { code: "38.3.1",    name: "Participantes",                                             type: "movimento",  nature: "credora",  classe: 3, parent: "38.3",    locked: true },
  { code: "38.3.2",    name: "Participadas",                                              type: "movimento",  nature: "credora",  classe: 3, parent: "38.3",    locked: true },
  { code: "38.4",      name: "Provisões para dívidas do pessoal",                         type: "acumulacao", nature: "credora",  classe: 3, parent: "38",      locked: true },
  { code: "38.4.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "38.4",    isCustom: true },
  { code: "38.9",      name: "Provisões para outros saldos a receber",                    type: "acumulacao", nature: "credora",  classe: 3, parent: "38",      locked: true },
  { code: "38.9.1",    name: "Vendas imobilizado",                                        type: "movimento",  nature: "credora",  classe: 3, parent: "38.9",    locked: true },
  { code: "39",        name: "Provisões para Outros Riscos e Encargos",                   type: "acumulacao", nature: "credora",  classe: 3, parent: "3",       locked: true },
  { code: "39.1",      name: "Provisões para pensões",                                    type: "acumulacao", nature: "credora",  classe: 3, parent: "39",      locked: true },
  { code: "39.1.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "39.1",    isCustom: true },
  { code: "39.2",      name: "Provisões para processos judiciais em curso",               type: "acumulacao", nature: "credora",  classe: 3, parent: "39",      locked: true },
  { code: "39.2.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "39.2",    isCustom: true },
  { code: "39.3",      name: "Provisões para acidentes de trabalho",                      type: "acumulacao", nature: "credora",  classe: 3, parent: "39",      locked: true },
  { code: "39.3.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "39.3",    isCustom: true },
  { code: "39.4",      name: "Provisões para garantias dadas a clientes",                 type: "acumulacao", nature: "credora",  classe: 3, parent: "39",      locked: true },
  { code: "39.4.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "39.4",    isCustom: true },
  { code: "39.9",      name: "Provisões para outros riscos e encargos",                   type: "acumulacao", nature: "credora",  classe: 3, parent: "39",      locked: true },
  { code: "39.9.1",    name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "credora",  classe: 3, parent: "39.9",    isCustom: true },

  // ── CLASSE 4 — MEIOS MONETÁRIOS ──────────────────────────────────────
  { code: "4",      name: "Meios Monetários",                                      type: "classe",     nature: "devedora", classe: 4, locked: true },
  { code: "41",     name: "Títulos Negociáveis",                                   type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    locked: true },
  { code: "41.1",   name: "Acções",                                                type: "acumulacao", nature: "devedora", classe: 4, parent: "41",   locked: true },
  { code: "41.1.1", name: "Empresas do grupo",                                     type: "movimento",  nature: "devedora", classe: 4, parent: "41.1", locked: true },
  { code: "41.1.2", name: "Associadas",                                            type: "movimento",  nature: "devedora", classe: 4, parent: "41.1", locked: true },
  { code: "41.1.3", name: "Outras empresas",                                       type: "movimento",  nature: "devedora", classe: 4, parent: "41.1", locked: true },
  { code: "41.2",   name: "Obrigações",                                            type: "acumulacao", nature: "devedora", classe: 4, parent: "41",   locked: true },
  { code: "41.2.1", name: "Empresas do grupo",                                     type: "movimento",  nature: "devedora", classe: 4, parent: "41.2", locked: true },
  { code: "41.2.2", name: "Associadas",                                            type: "movimento",  nature: "devedora", classe: 4, parent: "41.2", locked: true },
  { code: "41.2.3", name: "Outras empresas",                                       type: "movimento",  nature: "devedora", classe: 4, parent: "41.2", locked: true },
  { code: "41.3",   name: "Títulos da dívida pública",                             type: "acumulacao", nature: "devedora", classe: 4, parent: "41",   locked: true },
  { code: "41.3.1", name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 4, parent: "41.3", isCustom: true },
  { code: "42",     name: "Depósitos a Prazo",                                     type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    locked: true },
  { code: "42.1",   name: "Moeda nacional",                                        type: "acumulacao", nature: "devedora", classe: 4, parent: "42",   locked: true },
  { code: "42.1.1", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "42.1", isCustom: true },
  { code: "42.1.2", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "42.1", isCustom: true },
  { code: "42.2",   name: "Moeda estrangeira",                                     type: "acumulacao", nature: "devedora", classe: 4, parent: "42",   locked: true },
  { code: "42.2.1", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "42.2", isCustom: true },
  { code: "42.2.2", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "42.2", isCustom: true },
  { code: "43",     name: "Depósitos à Ordem",                                     type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    locked: true },
  { code: "43.1",   name: "Moeda nacional",                                        type: "acumulacao", nature: "devedora", classe: 4, parent: "43",   locked: true },
  { code: "43.1.1", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "43.1", isCustom: true },
  { code: "43.1.2", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "43.1", isCustom: true },
  { code: "43.2",   name: "Moeda estrangeira",                                     type: "acumulacao", nature: "devedora", classe: 4, parent: "43",   locked: true },
  { code: "43.2.1", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "43.2", isCustom: true },
  { code: "43.2.2", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "43.2", isCustom: true },
  { code: "44",     name: "Outros Depósitos",                                      type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    locked: true },
  { code: "44.1",   name: "Moeda nacional",                                        type: "acumulacao", nature: "devedora", classe: 4, parent: "44",   locked: true },
  { code: "44.1.1", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "44.1", isCustom: true },
  { code: "44.1.2", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "44.1", isCustom: true },
  { code: "44.2",   name: "Moeda estrangeira",                                     type: "acumulacao", nature: "devedora", classe: 4, parent: "44",   locked: true },
  { code: "44.2.1", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "44.2", isCustom: true },
  { code: "44.2.2", name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "44.2", isCustom: true },
  { code: "45",     name: "Caixa",                                                 type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    locked: true },
  { code: "45.1",   name: "Fundo fixo",                                            type: "acumulacao", nature: "devedora", classe: 4, parent: "45",   locked: true },
  { code: "45.1.1", name: "Caixa ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "45.1", isCustom: true },
  { code: "45.1.2", name: "Caixa ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "45.1", isCustom: true },
  { code: "45.2",   name: "Valores para depositar",                                type: "acumulacao", nature: "devedora", classe: 4, parent: "45",   locked: true },
  { code: "45.2.1", name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 4, parent: "45.2", isCustom: true },
  { code: "45.3",   name: "Valores destinados a pagamentos específicos",           type: "acumulacao", nature: "devedora", classe: 4, parent: "45",   locked: true },
  { code: "45.3.1", name: "Salários",                                              type: "movimento",  nature: "devedora", classe: 4, parent: "45.3", locked: true },
  { code: "46",     name: "Conta livre / a desenvolver",                           type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    isCustom: true },
  { code: "46.1",   name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 4, parent: "46",   isCustom: true },
  { code: "47",     name: "Conta livre / a desenvolver",                           type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    isCustom: true },
  { code: "47.1",   name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 4, parent: "47",   isCustom: true },
  { code: "48",     name: "Conta Transitória",                                     type: "acumulacao", nature: "devedora", classe: 4, parent: "4",    locked: true },
  { code: "48.1",   name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "48",   isCustom: true },
  { code: "48.2",   name: "Banco ___",                                             type: "movimento",  nature: "devedora", classe: 4, parent: "48",   isCustom: true },
  { code: "49",     name: "Provisões para Aplicações de Tesouraria",               type: "acumulacao", nature: "credora",  classe: 4, parent: "4",    locked: true },
  { code: "49.1",   name: "Títulos negociáveis",                                   type: "acumulacao", nature: "credora",  classe: 4, parent: "49",   locked: true },
  { code: "49.1.1", name: "Acções",                                                type: "movimento",  nature: "credora",  classe: 4, parent: "49.1", locked: true },
  { code: "49.1.2", name: "Obrigações",                                            type: "movimento",  nature: "credora",  classe: 4, parent: "49.1", locked: true },
  { code: "49.1.3", name: "Títulos da dívida pública",                             type: "movimento",  nature: "credora",  classe: 4, parent: "49.1", locked: true },
  { code: "49.2",   name: "Outras aplicações de tesouraria",                       type: "acumulacao", nature: "credora",  classe: 4, parent: "49",   locked: true },
  { code: "49.2.1", name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 4, parent: "49.2", isCustom: true },

  // ── CLASSE 5 — CAPITAL E RESERVAS ────────────────────────────────────
  { code: "5",      name: "Capital e Reservas",                                    type: "classe",     nature: "credora",  classe: 5, locked: true },
  { code: "51",     name: "Capital",                                               type: "movimento",  nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "52",     name: "Acções / Quotas Próprias",                              type: "acumulacao", nature: "devedora", classe: 5, parent: "5",    locked: true },
  { code: "52.1",   name: "Valor nominal",                                         type: "acumulacao", nature: "devedora", classe: 5, parent: "52",   locked: true },
  { code: "52.1.1", name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 5, parent: "52.1", isCustom: true },
  { code: "52.2",   name: "Descontos",                                             type: "acumulacao", nature: "devedora", classe: 5, parent: "52",   locked: true },
  { code: "52.2.1", name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "devedora", classe: 5, parent: "52.2", isCustom: true },
  { code: "52.3",   name: "Prémios",                                               type: "acumulacao", nature: "credora",  classe: 5, parent: "52",   locked: true },
  { code: "52.3.1", name: "Conta livre / a desenvolver",                           type: "movimento",  nature: "credora",  classe: 5, parent: "52.3", isCustom: true },
  { code: "53",     name: "Prémios de Emissão",                                    type: "movimento",  nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "54",     name: "Prestações Suplementares",                              type: "movimento",  nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "55",     name: "Reservas Legais",                                       type: "movimento",  nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "56",     name: "Reservas de Reavaliação",                               type: "acumulacao", nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "56.1",   name: "Legais",                                                type: "acumulacao", nature: "credora",  classe: 5, parent: "56",   locked: true },
  { code: "56.1.1", name: "Decreto-Lei n.º ___",                                   type: "movimento",  nature: "credora",  classe: 5, parent: "56.1", isCustom: true },
  { code: "56.1.2", name: "Decreto-Lei n.º ___",                                   type: "movimento",  nature: "credora",  classe: 5, parent: "56.1", isCustom: true },
  { code: "56.2",   name: "Autónomas",                                             type: "acumulacao", nature: "credora",  classe: 5, parent: "56",   locked: true },
  { code: "56.2.1", name: "Avaliação",                                             type: "movimento",  nature: "credora",  classe: 5, parent: "56.2", locked: true },
  { code: "56.2.2", name: "Realização",                                            type: "movimento",  nature: "credora",  classe: 5, parent: "56.2", locked: true },
  { code: "57",     name: "Reservas com Fins Especiais",                           type: "movimento",  nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "58",     name: "Reservas Livres",                                       type: "movimento",  nature: "credora",  classe: 5, parent: "5",    locked: true },
  { code: "59",     name: "Conta livre / a desenvolver",                           type: "acumulacao", nature: "credora",  classe: 5, parent: "5",    isCustom: true },

  // ── CLASSE 6 — PROVEITOS E GANHOS POR NATUREZA ───────────────────────
  { code: "6",          name: "Proveitos e Ganhos por Natureza",                        type: "classe",     nature: "credora",  classe: 6, locked: true },
  { code: "61",         name: "Vendas",                                                 type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "61.1",       name: "Produtos acabados e intermédios",                        type: "acumulacao", nature: "credora",  classe: 6, parent: "61",      iva: true, locked: true },
  { code: "61.1.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "61.1",    iva: true, locked: true },
  { code: "61.1.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "61.1",    iva: true, locked: true },
  { code: "61.2",       name: "Sub-produtos, desperdícios, resíduos e refugos",         type: "acumulacao", nature: "credora",  classe: 6, parent: "61",      iva: true, locked: true },
  { code: "61.2.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "61.2",    iva: true, locked: true },
  { code: "61.2.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "61.2",    iva: true, locked: true },
  { code: "61.3",       name: "Mercadorias",                                            type: "acumulacao", nature: "credora",  classe: 6, parent: "61",      iva: true, locked: true },
  { code: "61.3.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "61.3",    iva: true, locked: true },
  { code: "61.3.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "61.3",    iva: true, locked: true },
  { code: "61.4",       name: "Embalagens de consumo",                                  type: "acumulacao", nature: "credora",  classe: 6, parent: "61",      locked: true },
  { code: "61.4.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "61.4",    locked: true },
  { code: "61.4.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "61.4",    locked: true },
  { code: "61.5",       name: "Subsídios a preços",                                     type: "acumulacao", nature: "credora",  classe: 6, parent: "61",      locked: true },
  { code: "61.5.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "61.5",    isCustom: true },
  { code: "61.7",       name: "Devoluções",                                             type: "acumulacao", nature: "devedora", classe: 6, parent: "61",      locked: true },
  { code: "61.7.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "devedora", classe: 6, parent: "61.7",    locked: true },
  { code: "61.7.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "devedora", classe: 6, parent: "61.7",    locked: true },
  { code: "61.8",       name: "Descontos e abatimentos",                                type: "acumulacao", nature: "devedora", classe: 6, parent: "61",      locked: true },
  { code: "61.8.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "devedora", classe: 6, parent: "61.8",    locked: true },
  { code: "61.8.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "devedora", classe: 6, parent: "61.8",    locked: true },
  { code: "61.9",       name: "Transferência para resultados operacionais",              type: "movimento",  nature: "credora",  classe: 6, parent: "61",      locked: true },
  { code: "62",         name: "Prestações de Serviços",                                 type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "62.1",       name: "Serviços principais",                                    type: "acumulacao", nature: "credora",  classe: 6, parent: "62",      iva: true, locked: true },
  { code: "62.1.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "62.1",    iva: true, locked: true },
  { code: "62.1.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "62.1",    iva: true, locked: true },
  { code: "62.2",       name: "Serviços secundários",                                   type: "acumulacao", nature: "credora",  classe: 6, parent: "62",      iva: true, locked: true },
  { code: "62.2.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "62.2",    iva: true, locked: true },
  { code: "62.2.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "62.2",    iva: true, locked: true },
  { code: "62.8",       name: "Descontos e abatimentos",                                type: "acumulacao", nature: "devedora", classe: 6, parent: "62",      locked: true },
  { code: "62.8.1",     name: "Mercado nacional",                                       type: "movimento",  nature: "devedora", classe: 6, parent: "62.8",    locked: true },
  { code: "62.8.2",     name: "Mercado estrangeiro",                                    type: "movimento",  nature: "devedora", classe: 6, parent: "62.8",    locked: true },
  { code: "62.9",       name: "Transferência para resultados operacionais",              type: "movimento",  nature: "credora",  classe: 6, parent: "62",      locked: true },
  { code: "63",         name: "Outros Proveitos Operacionais",                          type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "63.1",       name: "Serviços suplementares",                                 type: "acumulacao", nature: "credora",  classe: 6, parent: "63",      locked: true },
  { code: "63.1.1",     name: "Aluguer de equipamento",                                 type: "movimento",  nature: "credora",  classe: 6, parent: "63.1",    locked: true },
  { code: "63.1.2",     name: "Cedência de pessoal",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "63.1",    locked: true },
  { code: "63.1.3",     name: "Cedência de energia",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "63.1",    locked: true },
  { code: "63.1.4",     name: "Estudos, projectos e assistência técnica",               type: "movimento",  nature: "credora",  classe: 6, parent: "63.1",    locked: true },
  { code: "63.2",       name: "Royalties",                                              type: "movimento",  nature: "credora",  classe: 6, parent: "63",      locked: true },
  { code: "63.3",       name: "Subsídios à exploração",                                 type: "movimento",  nature: "credora",  classe: 6, parent: "63",      locked: true },
  { code: "63.4",       name: "Subsídios a investimento",                               type: "movimento",  nature: "credora",  classe: 6, parent: "63",      locked: true },
  { code: "63.5",       name: "IVA",                                                    type: "movimento",  nature: "credora",  classe: 6, parent: "63",      iva: true, locked: true },
  { code: "63.8",       name: "Outros proveitos e ganhos operacionais",                 type: "acumulacao", nature: "credora",  classe: 6, parent: "63",      locked: true },
  { code: "63.8.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "63.8",    isCustom: true },
  { code: "63.9",       name: "Transferência para resultados operacionais",              type: "movimento",  nature: "credora",  classe: 6, parent: "63",      locked: true },
  { code: "64",         name: "Variação nos Inventários de Prod. Acabados e Prod. em Curso", type: "acumulacao", nature: "credora", classe: 6, parent: "6",   locked: true },
  { code: "64.1",       name: "Produtos e trabalhos em curso",                          type: "acumulacao", nature: "credora",  classe: 6, parent: "64",      locked: true },
  { code: "64.1.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "64.1",    isCustom: true },
  { code: "64.2",       name: "Produtos acabados",                                      type: "acumulacao", nature: "credora",  classe: 6, parent: "64",      locked: true },
  { code: "64.2.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "64.2",    isCustom: true },
  { code: "64.3",       name: "Produtos intermédios",                                   type: "acumulacao", nature: "credora",  classe: 6, parent: "64",      locked: true },
  { code: "64.3.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "64.3",    isCustom: true },
  { code: "64.9",       name: "Transferência para resultados operacionais",              type: "movimento",  nature: "credora",  classe: 6, parent: "64",      locked: true },
  { code: "65",         name: "Trabalhos para a Própria Empresa",                       type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "65.1",       name: "Para imobilizado",                                       type: "acumulacao", nature: "credora",  classe: 6, parent: "65",      locked: true },
  { code: "65.1.1",     name: "Corpóreo",                                               type: "movimento",  nature: "credora",  classe: 6, parent: "65.1",    locked: true },
  { code: "65.1.2",     name: "Incorpóreo",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "65.1",    locked: true },
  { code: "65.1.3",     name: "Financeiro",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "65.1",    locked: true },
  { code: "65.1.4",     name: "Em curso",                                               type: "movimento",  nature: "credora",  classe: 6, parent: "65.1",    locked: true },
  { code: "65.2",       name: "Para encargos a repartir por exercícios futuros",        type: "acumulacao", nature: "credora",  classe: 6, parent: "65",      locked: true },
  { code: "65.2.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "65.2",    isCustom: true },
  { code: "65.9",       name: "Transferência para resultados operacionais",              type: "movimento",  nature: "credora",  classe: 6, parent: "65",      locked: true },
  { code: "66",         name: "Proveitos e Ganhos Financeiros Gerais",                  type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "66.1",       name: "Juros",                                                  type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.1.1",     name: "De investimentos financeiros",                           type: "acumulacao", nature: "credora",  classe: 6, parent: "66.1",    locked: true },
  { code: "66.1.1.1",   name: "Obrigações",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "66.1.1",  locked: true },
  { code: "66.1.1.3",   name: "Títulos de participação",                                type: "movimento",  nature: "credora",  classe: 6, parent: "66.1.1",  locked: true },
  { code: "66.1.1.4",   name: "Empréstimos",                                            type: "movimento",  nature: "credora",  classe: 6, parent: "66.1.1",  locked: true },
  { code: "66.1.1.9",   name: "Outros",                                                 type: "movimento",  nature: "credora",  classe: 6, parent: "66.1.1",  locked: true },
  { code: "66.1.2",     name: "De mora relativos a dívidas de terceiros",               type: "acumulacao", nature: "credora",  classe: 6, parent: "66.1",    locked: true },
  { code: "66.1.2.1",   name: "Dívidas recebidas a prestações",                         type: "movimento",  nature: "credora",  classe: 6, parent: "66.1.2",  locked: true },
  { code: "66.1.2.2",   name: "De empréstimos a terceiros",                             type: "movimento",  nature: "credora",  classe: 6, parent: "66.1.2",  locked: true },
  { code: "66.1.4",     name: "Desconto de títulos",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "66.1",    locked: true },
  { code: "66.1.5",     name: "De aplicações de tesouraria",                            type: "movimento",  nature: "credora",  classe: 6, parent: "66.1",    locked: true },
  { code: "66.2",       name: "Diferenças de câmbio favoráveis",                        type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.2.1",     name: "Realizadas",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "66.2",    locked: true },
  { code: "66.2.2",     name: "Não realizadas",                                         type: "movimento",  nature: "credora",  classe: 6, parent: "66.2",    locked: true },
  { code: "66.3",       name: "Descontos de pronto pagamento obtidos",                  type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.3.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "66.3",    isCustom: true },
  { code: "66.4",       name: "Rendimentos de investimentos em imóveis",                type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.4.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "66.4",    isCustom: true },
  { code: "66.5",       name: "Rendimento de participações de capital",                 type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.5.1",     name: "Acções, quotas em outras empresas",                      type: "movimento",  nature: "credora",  classe: 6, parent: "66.5",    locked: true },
  { code: "66.5.2",     name: "Acções, quotas incluídas nos fundos",                    type: "movimento",  nature: "credora",  classe: 6, parent: "66.5",    locked: true },
  { code: "66.5.3",     name: "Acções, quotas incluídas nos títulos negociáveis",       type: "movimento",  nature: "credora",  classe: 6, parent: "66.5",    locked: true },
  { code: "66.6",       name: "Ganhos na alienação de aplicações financeiras",          type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.6.1",     name: "Investimentos financeiros",                              type: "acumulacao", nature: "credora",  classe: 6, parent: "66.6",    locked: true },
  { code: "66.6.1.1",   name: "Subsidiárias",                                           type: "movimento",  nature: "credora",  classe: 6, parent: "66.6.1",  locked: true },
  { code: "66.6.1.2",   name: "Associadas",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "66.6.1",  locked: true },
  { code: "66.6.1.3",   name: "Outras empresas",                                        type: "movimento",  nature: "credora",  classe: 6, parent: "66.6.1",  locked: true },
  { code: "66.6.1.4",   name: "Imóveis",                                                type: "movimento",  nature: "credora",  classe: 6, parent: "66.6.1",  locked: true },
  { code: "66.6.1.5",   name: "Fundos",                                                 type: "movimento",  nature: "credora",  classe: 6, parent: "66.6.1",  locked: true },
  { code: "66.6.1.9",   name: "Outros investimentos",                                   type: "movimento",  nature: "credora",  classe: 6, parent: "66.6.1",  locked: true },
  { code: "66.6.2",     name: "Títulos negociáveis",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "66.6",    locked: true },
  { code: "66.7",       name: "Reposição de provisões",                                 type: "acumulacao", nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "66.7.1",     name: "Investimentos financeiros",                              type: "acumulacao", nature: "credora",  classe: 6, parent: "66.7",    locked: true },
  { code: "66.7.1.1",   name: "Subsidiárias",                                           type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.1",  locked: true },
  { code: "66.7.1.2",   name: "Associadas",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.1",  locked: true },
  { code: "66.7.1.3",   name: "Outras empresas",                                        type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.1",  locked: true },
  { code: "66.7.1.4",   name: "Fundos",                                                 type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.1",  locked: true },
  { code: "66.7.1.9",   name: "Outros investimentos",                                   type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.1",  locked: true },
  { code: "66.7.2",     name: "Aplicações de tesouraria",                               type: "acumulacao", nature: "credora",  classe: 6, parent: "66.7",    locked: true },
  { code: "66.7.2.1",   name: "Títulos negociáveis",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.2",  locked: true },
  { code: "66.7.2.2",   name: "Depósitos a prazo",                                      type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.2",  locked: true },
  { code: "66.7.2.3",   name: "Outros depósitos",                                       type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.2",  locked: true },
  { code: "66.7.2.9",   name: "Outros investimentos",                                   type: "movimento",  nature: "credora",  classe: 6, parent: "66.7.2",  locked: true },
  { code: "66.9",       name: "Transferência para resultados financeiros",               type: "movimento",  nature: "credora",  classe: 6, parent: "66",      locked: true },
  { code: "67",         name: "Proveitos e Ganhos Financeiros em Filiais e Associadas", type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "67.1",       name: "Rendimento de participações de capital",                 type: "acumulacao", nature: "credora",  classe: 6, parent: "67",      locked: true },
  { code: "67.1.1",     name: "Subsidiárias",                                           type: "movimento",  nature: "credora",  classe: 6, parent: "67.1",    locked: true },
  { code: "67.1.2",     name: "Associadas",                                             type: "movimento",  nature: "credora",  classe: 6, parent: "67.1",    locked: true },
  { code: "67.9",       name: "Transferência para resultados em filiais e associadas",  type: "movimento",  nature: "credora",  classe: 6, parent: "67",      locked: true },
  { code: "68",         name: "Outros Proveitos e Ganhos Não Operacionais",             type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "68.1",       name: "Reposição de provisões",                                 type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.1.1",     name: "Existências",                                            type: "acumulacao", nature: "credora",  classe: 6, parent: "68.1",    locked: true },
  { code: "68.1.1.1",   name: "Matérias-primas subsidiárias e de consumo",              type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.1",  locked: true },
  { code: "68.1.1.2",   name: "Produtos e trabalhos em curso",                          type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.1",  locked: true },
  { code: "68.1.1.3",   name: "Produtos acabados e intermédios",                        type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.1",  locked: true },
  { code: "68.1.1.4",   name: "Sub-produtos, desperdícios, resíduos e refugos",         type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.1",  locked: true },
  { code: "68.1.1.5",   name: "Mercadorias",                                            type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.1",  locked: true },
  { code: "68.1.2",     name: "Cobranças duvidosas",                                    type: "acumulacao", nature: "credora",  classe: 6, parent: "68.1",    locked: true },
  { code: "68.1.2.1",   name: "Clientes",                                               type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.2.2",   name: "Clientes — títulos a receber",                           type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.2.3",   name: "Clientes — cobrança duvidosa",                           type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.2.4",   name: "Saldos devedores de fornecedores",                       type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.2.5",   name: "Participantes e participadas",                           type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.2.6",   name: "Dívidas do pessoal",                                     type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.2.9",   name: "Outros saldos a receber",                                type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.2",  locked: true },
  { code: "68.1.3",     name: "Riscos e encargos",                                      type: "acumulacao", nature: "credora",  classe: 6, parent: "68.1",    locked: true },
  { code: "68.1.3.1",   name: "Pensões",                                                type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.3",  locked: true },
  { code: "68.1.3.2",   name: "Processos judiciais em curso",                           type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.3",  locked: true },
  { code: "68.1.3.3",   name: "Acidentes de trabalho",                                  type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.3",  locked: true },
  { code: "68.1.3.4",   name: "Garantias dadas a clientes",                             type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.3",  locked: true },
  { code: "68.1.3.9",   name: "Outros riscos e encargos",                               type: "movimento",  nature: "credora",  classe: 6, parent: "68.1.3",  locked: true },
  { code: "68.2",       name: "Anulação de amortizações extraordinárias",               type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.2.1",     name: "Imobilizações corpóreas",                                type: "movimento",  nature: "credora",  classe: 6, parent: "68.2",    locked: true },
  { code: "68.2.2",     name: "Imobilizações incorpóreas",                              type: "movimento",  nature: "credora",  classe: 6, parent: "68.2",    locked: true },
  { code: "68.3",       name: "Ganhos em imobilizações",                                type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.3.1",     name: "Venda de imobilizações corpóreas",                       type: "movimento",  nature: "credora",  classe: 6, parent: "68.3",    locked: true },
  { code: "68.3.2",     name: "Venda de imobilizações incorpóreas",                     type: "movimento",  nature: "credora",  classe: 6, parent: "68.3",    locked: true },
  { code: "68.4",       name: "Ganhos em existências",                                  type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.4.1",     name: "Sobras",                                                 type: "movimento",  nature: "credora",  classe: 6, parent: "68.4",    locked: true },
  { code: "68.5",       name: "Recuperação de dívidas",                                 type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.5.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "68.5",    isCustom: true },
  { code: "68.6",       name: "Benefícios de penalidades contratuais",                  type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.6.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "68.6",    isCustom: true },
  { code: "68.7",       name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "68",      isCustom: true },
  { code: "68.8",       name: "Descontinuidade de operações",                           type: "movimento",  nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.9",       name: "Alterações de políticas contabilísticas",                type: "movimento",  nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.10",      name: "Correcções relativas a exercícios anteriores",           type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.10.1",    name: "Estimativa impostos",                                    type: "movimento",  nature: "credora",  classe: 6, parent: "68.10",   locked: true },
  { code: "68.10.2",    name: "Restituição de impostos",                                type: "movimento",  nature: "credora",  classe: 6, parent: "68.10",   locked: true },
  { code: "68.11",      name: "Outros ganhos e perdas não operacionais",                type: "acumulacao", nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "68.11.1",    name: "Donativos",                                              type: "movimento",  nature: "credora",  classe: 6, parent: "68.11",   locked: true },
  { code: "68.19",      name: "Transferência para resultados não operacionais",         type: "movimento",  nature: "credora",  classe: 6, parent: "68",      locked: true },
  { code: "69",         name: "Proveitos e Ganhos Extraordinários",                     type: "acumulacao", nature: "credora",  classe: 6, parent: "6",       locked: true },
  { code: "69.1",       name: "Ganhos resultantes de catástrofes naturais",             type: "acumulacao", nature: "credora",  classe: 6, parent: "69",      locked: true },
  { code: "69.1.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "69.1",    isCustom: true },
  { code: "69.2",       name: "Ganhos resultantes de convulsões políticas",             type: "acumulacao", nature: "credora",  classe: 6, parent: "69",      locked: true },
  { code: "69.2.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "69.2",    isCustom: true },
  { code: "69.3",       name: "Ganhos resultantes de expropriações",                    type: "acumulacao", nature: "credora",  classe: 6, parent: "69",      locked: true },
  { code: "69.3.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "69.3",    isCustom: true },
  { code: "69.4",       name: "Ganhos resultantes de sinistros",                        type: "acumulacao", nature: "credora",  classe: 6, parent: "69",      locked: true },
  { code: "69.4.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "69.4",    isCustom: true },
  { code: "69.5",       name: "Subsídios",                                              type: "acumulacao", nature: "credora",  classe: 6, parent: "69",      locked: true },
  { code: "69.5.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "69.5",    isCustom: true },
  { code: "69.6",       name: "Anulação de passivos não exigíveis",                     type: "acumulacao", nature: "credora",  classe: 6, parent: "69",      locked: true },
  { code: "69.6.1",     name: "Conta livre / a desenvolver",                            type: "movimento",  nature: "credora",  classe: 6, parent: "69.6",    isCustom: true },
  { code: "69.9",       name: "Transferência para resultados extraordinários",          type: "movimento",  nature: "credora",  classe: 6, parent: "69",      locked: true },

  // ── CLASSE 7 — CUSTOS E PERDAS POR NATUREZA ──────────────────────────
  { code: "7",           name: "Custos e Perdas por Natureza",                              type: "classe",     nature: "devedora", classe: 7, locked: true },
  { code: "71",          name: "Custo das existências vendidas",                            type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "71.1",        name: "Matérias-primas",                                           type: "acumulacao", nature: "devedora", classe: 7, parent: "71",       locked: true },
  { code: "71.1.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "71.1",     isCustom: true },
  { code: "71.2",        name: "Matérias subsidiárias",                                     type: "acumulacao", nature: "devedora", classe: 7, parent: "71",       locked: true },
  { code: "71.2.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "71.2",     isCustom: true },
  { code: "71.3",        name: "Materiais diversos",                                        type: "acumulacao", nature: "devedora", classe: 7, parent: "71",       locked: true },
  { code: "71.3.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "71.3",     isCustom: true },
  { code: "71.4",        name: "Embalagens de consumo",                                     type: "acumulacao", nature: "devedora", classe: 7, parent: "71",       locked: true },
  { code: "71.4.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "71.4",     isCustom: true },
  { code: "71.5",        name: "Outros materiais",                                          type: "acumulacao", nature: "devedora", classe: 7, parent: "71",       locked: true },
  { code: "71.5.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "71.5",     isCustom: true },
  { code: "71.9",        name: "Transferência para resultados operacionais",                 type: "movimento",  nature: "devedora", classe: 7, parent: "71",       locked: true },
  { code: "72",          name: "Custos com o pessoal",                                      type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "72.1",        name: "Remunerações – Órgãos sociais",                             type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.1.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "72.1",     isCustom: true },
  { code: "72.2",        name: "Remunerações – Pessoal",                                    type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.2.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "72.2",     isCustom: true },
  { code: "72.3",        name: "Pensões",                                                   type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.3.1",      name: "Órgãos sociais",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "72.3",     locked: true },
  { code: "72.3.2",      name: "Pessoal",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "72.3",     locked: true },
  { code: "72.4",        name: "Prémios para pensões",                                      type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.4.1",      name: "Órgãos sociais",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "72.4",     locked: true },
  { code: "72.4.2",      name: "Pessoal",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "72.4",     locked: true },
  { code: "72.5",        name: "Encargos sobre remunerações",                               type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.5.1",      name: "Órgãos sociais",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "72.5",     locked: true },
  { code: "72.5.2",      name: "Pessoal",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "72.5",     locked: true },
  { code: "72.6",        name: "Seguros de acidentes de trabalho e doenças profissionais",  type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.6.1",      name: "Órgãos sociais",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "72.6",     locked: true },
  { code: "72.6.2",      name: "Pessoal",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "72.6",     locked: true },
  { code: "72.7",        name: "Formação",                                                  type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.7.1",      name: "Órgãos sociais",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "72.7",     locked: true },
  { code: "72.7.2",      name: "Pessoal",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "72.7",     locked: true },
  { code: "72.8",        name: "Outras despesas com o pessoal",                             type: "acumulacao", nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "72.8.1",      name: "Órgãos sociais",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "72.8",     locked: true },
  { code: "72.8.2",      name: "Pessoal",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "72.8",     locked: true },
  { code: "72.9",        name: "Transferência para resultados operacionais",                 type: "movimento",  nature: "devedora", classe: 7, parent: "72",       locked: true },
  { code: "73",          name: "Amortizações do exercício",                                 type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "73.1",        name: "Imobilizações corpóreas",                                   type: "acumulacao", nature: "devedora", classe: 7, parent: "73",       locked: true },
  { code: "73.1.2",      name: "Edifícios e outras construções",                            type: "movimento",  nature: "devedora", classe: 7, parent: "73.1",     locked: true },
  { code: "73.1.3",      name: "Equipamento básico",                                        type: "movimento",  nature: "devedora", classe: 7, parent: "73.1",     locked: true },
  { code: "73.1.4",      name: "Equipamento de carga e transporte",                         type: "movimento",  nature: "devedora", classe: 7, parent: "73.1",     locked: true },
  { code: "73.1.5",      name: "Equipamento administrativo",                                type: "movimento",  nature: "devedora", classe: 7, parent: "73.1",     locked: true },
  { code: "73.1.6",      name: "Taras e vasilhame",                                         type: "movimento",  nature: "devedora", classe: 7, parent: "73.1",     locked: true },
  { code: "73.1.9",      name: "Outras imobilizações corpóreas",                            type: "movimento",  nature: "devedora", classe: 7, parent: "73.1",     locked: true },
  { code: "73.2",        name: "Imobilizações incorpóreas",                                 type: "acumulacao", nature: "devedora", classe: 7, parent: "73",       locked: true },
  { code: "73.2.1",      name: "Trespasses",                                                type: "movimento",  nature: "devedora", classe: 7, parent: "73.2",     locked: true },
  { code: "73.2.2",      name: "Despesas de investigação e desenvolvimento",                type: "movimento",  nature: "devedora", classe: 7, parent: "73.2",     locked: true },
  { code: "73.2.3",      name: "Propriedade industrial e outros direitos e contratos",      type: "movimento",  nature: "devedora", classe: 7, parent: "73.2",     locked: true },
  { code: "73.2.4",      name: "Despesas de constituição",                                  type: "movimento",  nature: "devedora", classe: 7, parent: "73.2",     locked: true },
  { code: "73.2.9",      name: "Outras imobilizações incorpóreas",                          type: "movimento",  nature: "devedora", classe: 7, parent: "73.2",     locked: true },
  { code: "73.9",        name: "Transferência para resultados operacionais",                 type: "movimento",  nature: "devedora", classe: 7, parent: "73",       locked: true },
  { code: "74",          name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "7",        isCustom: true },
  { code: "75",          name: "Outros custos e perdas operacionais",                       type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "75.1",        name: "Sub-contratos",                                             type: "acumulacao", nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.1.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "75.1",     isCustom: true },
  { code: "75.2",        name: "Fornecimentos e serviços de terceiros",                     type: "acumulacao", nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.2.11",     name: "Água",                                                      type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.12",     name: "Electricidade",                                             type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.13",     name: "Combustíveis e outros fluídos",                             type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.14",     name: "Conservação e reparação",                                   type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.15",     name: "Material de protecção segurança e conforto",                type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.16",     name: "Ferramentas e utensílios de desgaste rápido",               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.17",     name: "Material de escritório",                                    type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.18",     name: "Livros e documentação técnica",                             type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.19",     name: "Outros fornecimentos",                                      type: "acumulacao", nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.19.1",   name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2.19",  isCustom: true },
  { code: "75.2.20",     name: "Comunicação",                                               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.21",     name: "Rendas e alugueres",                                        type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.22",     name: "Seguros",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.23",     name: "Deslocações e estadas",                                     type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.24",     name: "Despesas de representação",                                 type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.26",     name: "Conservação e reparação (serviços externos)",               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.27",     name: "Vigilância e segurança",                                    type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.28",     name: "Limpeza, higiene e conforto",                               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.29",     name: "Publicidade e propaganda",                                  type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.30",     name: "Contencioso e notariado",                                   type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.31",     name: "Comissões a intermediários",                                type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.32",     name: "Assistência técnica",                                       type: "acumulacao", nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.32.1",   name: "Estrangeira",                                               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2.32",  locked: true },
  { code: "75.2.32.2",   name: "Nacional",                                                  type: "movimento",  nature: "devedora", classe: 7, parent: "75.2.32",  locked: true },
  { code: "75.2.33",     name: "Trabalhos executados no exterior",                          type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.34",     name: "Honorários e avenças",                                      type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.35",     name: "Royalties",                                                 type: "movimento",  nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.39",     name: "Outros serviços",                                           type: "acumulacao", nature: "devedora", classe: 7, parent: "75.2",     locked: true },
  { code: "75.2.39.1",   name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "75.2.39",  isCustom: true },
  { code: "75.3",        name: "Impostos",                                                  type: "acumulacao", nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.3.1",      name: "Indirectos",                                                type: "acumulacao", nature: "devedora", classe: 7, parent: "75.3",     locked: true },
  { code: "75.3.1.1",    name: "Imposto de selo",                                           type: "movimento",  nature: "devedora", classe: 7, parent: "75.3.1",   locked: true },
  { code: "75.3.1.2",    name: "IVA",                                                       type: "movimento",  nature: "devedora", classe: 7, parent: "75.3.1",   locked: true, iva: true },
  { code: "75.3.1.9",    name: "Outros impostos",                                           type: "movimento",  nature: "devedora", classe: 7, parent: "75.3.1",   locked: true },
  { code: "75.3.2",      name: "Directos",                                                  type: "acumulacao", nature: "devedora", classe: 7, parent: "75.3",     locked: true },
  { code: "75.3.2.1",    name: "Imposto de capitais",                                       type: "movimento",  nature: "devedora", classe: 7, parent: "75.3.2",   locked: true },
  { code: "75.3.2.2",    name: "Contribuição predial",                                      type: "movimento",  nature: "devedora", classe: 7, parent: "75.3.2",   locked: true },
  { code: "75.3.2.9",    name: "Outros impostos",                                           type: "movimento",  nature: "devedora", classe: 7, parent: "75.3.2",   locked: true },
  { code: "75.4",        name: "Despesas confidênciais",                                    type: "movimento",  nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.5",        name: "Quotizações",                                               type: "movimento",  nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.6",        name: "Ofertas e amostras de existências",                         type: "movimento",  nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.8",        name: "Outros custos e perdas operacionais",                       type: "movimento",  nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "75.9",        name: "Transferências para resultados operacionais",               type: "movimento",  nature: "devedora", classe: 7, parent: "75",       locked: true },
  { code: "76",          name: "Custos e perdas financeiros gerais",                        type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "76.1",        name: "Juros",                                                     type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.1.1",      name: "De empréstimos",                                            type: "acumulacao", nature: "devedora", classe: 7, parent: "76.1",     locked: true },
  { code: "76.1.1.1",    name: "Bancários",                                                 type: "movimento",  nature: "devedora", classe: 7, parent: "76.1.1",   locked: true },
  { code: "76.1.1.2",    name: "Obrigações",                                                type: "movimento",  nature: "devedora", classe: 7, parent: "76.1.1",   locked: true },
  { code: "76.1.1.3",    name: "Títulos de participação",                                   type: "movimento",  nature: "devedora", classe: 7, parent: "76.1.1",   locked: true },
  { code: "76.1.2",      name: "De descobertos bancários",                                  type: "movimento",  nature: "devedora", classe: 7, parent: "76.1",     locked: true },
  { code: "76.1.3",      name: "De mora relativos a dívidas a terceiros",                   type: "movimento",  nature: "devedora", classe: 7, parent: "76.1",     locked: true },
  { code: "76.1.4",      name: "De desconto de títulos",                                    type: "movimento",  nature: "devedora", classe: 7, parent: "76.1",     locked: true },
  { code: "76.2",        name: "Diferenças de câmbio desfavoráveis",                        type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.2.1",      name: "Realizadas",                                                type: "movimento",  nature: "devedora", classe: 7, parent: "76.2",     locked: true },
  { code: "76.2.2",      name: "Não realizadas",                                            type: "movimento",  nature: "devedora", classe: 7, parent: "76.2",     locked: true },
  { code: "76.3",        name: "Descontos de pronto pagamento concedidos",                  type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.3.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "76.3",     isCustom: true },
  { code: "76.4",        name: "Amortizações de investimentos em imóveis",                  type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.4.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "76.4",     isCustom: true },
  { code: "76.5",        name: "Provisões para aplicações financeiras",                     type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.5.1",      name: "Investimentos financeiros",                                 type: "acumulacao", nature: "devedora", classe: 7, parent: "76.5",     locked: true },
  { code: "76.5.1.1",    name: "Subsidiárias",                                              type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.1",   locked: true },
  { code: "76.5.1.2",    name: "Associadas",                                                type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.1",   locked: true },
  { code: "76.5.1.3",    name: "Outras empresas",                                           type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.1",   locked: true },
  { code: "76.5.1.4",    name: "Fundos",                                                    type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.1",   locked: true },
  { code: "76.5.1.9",    name: "Outros investimentos",                                      type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.1",   locked: true },
  { code: "76.5.2",      name: "Aplicações de tesouraria",                                  type: "acumulacao", nature: "devedora", classe: 7, parent: "76.5",     locked: true },
  { code: "76.5.2.1",    name: "Títulos negociáveis",                                       type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.2",   locked: true },
  { code: "76.5.2.2",    name: "Depósitos a prazo",                                         type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.2",   locked: true },
  { code: "76.5.2.3",    name: "Outros depósitos",                                          type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.2",   locked: true },
  { code: "76.5.2.9",    name: "Outros",                                                    type: "movimento",  nature: "devedora", classe: 7, parent: "76.5.2",   locked: true },
  { code: "76.6",        name: "Perdas na alienação de aplicações financeiras",             type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.6.1",      name: "Investimentos financeiros",                                 type: "acumulacao", nature: "devedora", classe: 7, parent: "76.6",     locked: true },
  { code: "76.6.1.1",    name: "Subsidiárias",                                              type: "movimento",  nature: "devedora", classe: 7, parent: "76.6.1",   locked: true },
  { code: "76.6.1.2",    name: "Associadas",                                                type: "movimento",  nature: "devedora", classe: 7, parent: "76.6.1",   locked: true },
  { code: "76.6.1.3",    name: "Outras empresas",                                           type: "movimento",  nature: "devedora", classe: 7, parent: "76.6.1",   locked: true },
  { code: "76.6.1.4",    name: "Fundos",                                                    type: "movimento",  nature: "devedora", classe: 7, parent: "76.6.1",   locked: true },
  { code: "76.6.1.9",    name: "Outros investimentos",                                      type: "movimento",  nature: "devedora", classe: 7, parent: "76.6.1",   locked: true },
  { code: "76.6.2",      name: "Aplicações de títulos negociáveis",                         type: "movimento",  nature: "devedora", classe: 7, parent: "76.6",     locked: true },
  { code: "76.7",        name: "Serviços bancários",                                        type: "acumulacao", nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "76.7.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "76.7",     isCustom: true },
  { code: "76.9",        name: "Transferência para resultados financeiros",                  type: "movimento",  nature: "devedora", classe: 7, parent: "76",       locked: true },
  { code: "77",          name: "Custos e perdas financeiros em filiais e associadas",        type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "77.9",        name: "Transferência para resultados financeiros",                  type: "movimento",  nature: "devedora", classe: 7, parent: "77",       locked: true },
  { code: "78",          name: "Outros custos e perdas não operacionais",                   type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "78.1",        name: "Provisões do exercício",                                    type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.1.1",      name: "Existências",                                               type: "acumulacao", nature: "devedora", classe: 7, parent: "78.1",     locked: true },
  { code: "78.1.1.1",    name: "Matérias-primas subsidiárias e de consumo",                 type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.1",   locked: true },
  { code: "78.1.1.2",    name: "Produtos e trabalhos em curso",                             type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.1",   locked: true },
  { code: "78.1.1.3",    name: "Produtos acabados e intermédios",                           type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.1",   locked: true },
  { code: "78.1.1.4",    name: "Sub-produtos, desperdícios, resíduos e refugos",            type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.1",   locked: true },
  { code: "78.1.1.5",    name: "Mercadorias",                                               type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.1",   locked: true },
  { code: "78.1.2",      name: "Cobranças duvidosas",                                       type: "acumulacao", nature: "devedora", classe: 7, parent: "78.1",     locked: true },
  { code: "78.1.2.1",    name: "Clientes",                                                  type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.2.2",    name: "Clientes – títulos a receber",                              type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.2.3",    name: "Clientes – cobrança duvidosa",                              type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.2.4",    name: "Saldos devedores de fornecedores",                          type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.2.5",    name: "Participantes e participadas",                              type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.2.6",    name: "Dívidas do pessoal",                                        type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.2.9",    name: "Outros saldos a receber",                                   type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.2",   locked: true },
  { code: "78.1.3",      name: "Riscos e encargos",                                         type: "acumulacao", nature: "devedora", classe: 7, parent: "78.1",     locked: true },
  { code: "78.1.3.1",    name: "Pensões",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.3",   locked: true },
  { code: "78.1.3.2",    name: "Processos judiciais em curso",                              type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.3",   locked: true },
  { code: "78.1.3.3",    name: "Acidentes de trabalho",                                     type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.3",   locked: true },
  { code: "78.1.3.4",    name: "Garantias dadas a clientes",                                type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.3",   locked: true },
  { code: "78.1.3.9",    name: "Outros riscos e encargos",                                  type: "movimento",  nature: "devedora", classe: 7, parent: "78.1.3",   locked: true },
  { code: "78.2",        name: "Amortizações extraordinárias",                              type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.2.1",      name: "Imobilizações corpóreas",                                   type: "movimento",  nature: "devedora", classe: 7, parent: "78.2",     locked: true },
  { code: "78.2.2",      name: "Imobilizações incorpóreas",                                 type: "movimento",  nature: "devedora", classe: 7, parent: "78.2",     locked: true },
  { code: "78.3",        name: "Perdas em imobilizações",                                   type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.3.1",      name: "Venda de imobilizações corpóreas",                          type: "movimento",  nature: "devedora", classe: 7, parent: "78.3",     locked: true },
  { code: "78.3.2",      name: "Venda de imobilizações incorpóreas",                        type: "movimento",  nature: "devedora", classe: 7, parent: "78.3",     locked: true },
  { code: "78.3.3",      name: "Abates",                                                    type: "movimento",  nature: "devedora", classe: 7, parent: "78.3",     locked: true },
  { code: "78.3.9",      name: "Outras",                                                    type: "movimento",  nature: "devedora", classe: 7, parent: "78.3",     locked: true },
  { code: "78.4",        name: "Perdas em existências",                                     type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.4.1",      name: "Quebras",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "78.4",     locked: true },
  { code: "78.5",        name: "Dívidas incobráveis",                                       type: "movimento",  nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.6",        name: "Multas e penalidades contratuais",                          type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.6.1",      name: "Fiscais",                                                   type: "movimento",  nature: "devedora", classe: 7, parent: "78.6",     locked: true },
  { code: "78.6.2",      name: "Não fiscais",                                               type: "movimento",  nature: "devedora", classe: 7, parent: "78.6",     locked: true },
  { code: "78.6.3",      name: "Penalidades contratuais",                                   type: "movimento",  nature: "devedora", classe: 7, parent: "78.6",     locked: true },
  { code: "78.7",        name: "Custos de reestruturação",                                  type: "movimento",  nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.8",        name: "Descontinuidade de operações",                              type: "movimento",  nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.9",        name: "Alterações de políticas contabilísticas",                   type: "movimento",  nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.10",       name: "Correcções relativas a exercícios anteriores",              type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.10.1",     name: "Estimativa impostos",                                       type: "movimento",  nature: "devedora", classe: 7, parent: "78.10",    locked: true },
  { code: "78.11",       name: "Outros custos e perdas não operacionais",                   type: "acumulacao", nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "78.11.1",     name: "Donativos",                                                 type: "movimento",  nature: "devedora", classe: 7, parent: "78.11",    locked: true },
  { code: "78.11.2",     name: "Reembolso de subsídios à exploração",                       type: "movimento",  nature: "devedora", classe: 7, parent: "78.11",    locked: true },
  { code: "78.11.3",     name: "Reembolso de subsídios a investimentos",                    type: "movimento",  nature: "devedora", classe: 7, parent: "78.11",    locked: true },
  { code: "78.19",       name: "Transferência para resultados não operacionais",            type: "movimento",  nature: "devedora", classe: 7, parent: "78",       locked: true },
  { code: "79",          name: "Custos e perdas extraordinárias",                           type: "acumulacao", nature: "devedora", classe: 7, parent: "7",        locked: true },
  { code: "79.1",        name: "Perdas resultantes de catástrofes naturais",                type: "acumulacao", nature: "devedora", classe: 7, parent: "79",       locked: true },
  { code: "79.1.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "79.1",     isCustom: true },
  { code: "79.2",        name: "Perdas resultantes de convulsões políticas",                type: "acumulacao", nature: "devedora", classe: 7, parent: "79",       locked: true },
  { code: "79.2.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "79.2",     isCustom: true },
  { code: "79.3",        name: "Perdas resultantes de expropriações",                       type: "acumulacao", nature: "devedora", classe: 7, parent: "79",       locked: true },
  { code: "79.3.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "79.3",     isCustom: true },
  { code: "79.4",        name: "Perdas resultantes de sinistros",                           type: "acumulacao", nature: "devedora", classe: 7, parent: "79",       locked: true },
  { code: "79.4.1",      name: "Conta livre / a desenvolver",                               type: "movimento",  nature: "devedora", classe: 7, parent: "79.4",     isCustom: true },
  { code: "79.9",        name: "Transferência para resultados extraordinários",             type: "movimento",  nature: "devedora", classe: 7, parent: "79",       locked: true },

  // ── CLASSE 8 — RESULTADOS ─────────────────────────────────────────────
  { code: "8",      name: "Resultados",                                                        type: "classe",     nature: "credora",  classe: 8, locked: true },
  { code: "81",     name: "Resultados transitados",                                            type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "81.1",   name: "Ano____",                                                           type: "acumulacao", nature: "credora",  classe: 8, parent: "81",    isCustom: true },
  { code: "81.1.1", name: "Resultado do ano",                                                  type: "movimento",  nature: "credora",  classe: 8, parent: "81.1",  locked: true },
  { code: "81.1.2", name: "Aplicação de resultados",                                           type: "movimento",  nature: "devedora", classe: 8, parent: "81.1",  locked: true },
  { code: "81.1.3", name: "Correcções de erros fundamentais, no exercício seguinte",           type: "movimento",  nature: "credora",  classe: 8, parent: "81.1",  locked: true },
  { code: "81.1.4", name: "Efeito das alterações de políticas contabilísticas",                type: "movimento",  nature: "credora",  classe: 8, parent: "81.1",  locked: true },
  { code: "81.1.5", name: "Imposto relativo a correcções de erros e alterações de políticas", type: "movimento",  nature: "devedora", classe: 8, parent: "81.1",  locked: true },
  { code: "81.2",   name: "Ano____",                                                           type: "acumulacao", nature: "credora",  classe: 8, parent: "81",    isCustom: true },
  { code: "81.2.1", name: "Resultado do ano",                                                  type: "movimento",  nature: "credora",  classe: 8, parent: "81.2",  locked: true },
  { code: "81.2.2", name: "Aplicação de resultados",                                           type: "movimento",  nature: "devedora", classe: 8, parent: "81.2",  locked: true },
  { code: "81.2.3", name: "Correcções de erros fundamentais, no exercício seguinte",           type: "movimento",  nature: "credora",  classe: 8, parent: "81.2",  locked: true },
  { code: "81.2.4", name: "Efeito das alterações de políticas contabilísticas",                type: "movimento",  nature: "credora",  classe: 8, parent: "81.2",  locked: true },
  { code: "81.2.5", name: "Imposto relativo a correcções de erros e alterações de políticas", type: "movimento",  nature: "devedora", classe: 8, parent: "81.2",  locked: true },
  { code: "82",     name: "Resultados operacionais",                                           type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "82.1",   name: "Vendas",                                                            type: "movimento",  nature: "credora",  classe: 8, parent: "82",    locked: true },
  { code: "82.2",   name: "Prestações de serviço",                                             type: "movimento",  nature: "credora",  classe: 8, parent: "82",    locked: true },
  { code: "82.3",   name: "Outros proveitos operacionais",                                     type: "movimento",  nature: "credora",  classe: 8, parent: "82",    locked: true },
  { code: "82.4",   name: "Variação nos inventários de prod. acabados e em vias de fabrico",  type: "movimento",  nature: "credora",  classe: 8, parent: "82",    locked: true },
  { code: "82.5",   name: "Trabalhos para a própria empresa",                                  type: "movimento",  nature: "credora",  classe: 8, parent: "82",    locked: true },
  { code: "82.6",   name: "Custo das existências vendidas e das matérias consumidas",          type: "movimento",  nature: "devedora", classe: 8, parent: "82",    locked: true },
  { code: "82.7",   name: "Custos com o pessoal",                                              type: "movimento",  nature: "devedora", classe: 8, parent: "82",    locked: true },
  { code: "82.8",   name: "Amortizações do exercício",                                         type: "movimento",  nature: "devedora", classe: 8, parent: "82",    locked: true },
  { code: "82.9",   name: "Outros custos operacionais",                                        type: "movimento",  nature: "devedora", classe: 8, parent: "82",    locked: true },
  { code: "82.19",  name: "Transferência para resultados líquidos",                            type: "movimento",  nature: "credora",  classe: 8, parent: "82",    locked: true },
  { code: "83",     name: "Resultados financeiros",                                            type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "83.1",   name: "Proveitos e ganhos financeiros gerais",                             type: "movimento",  nature: "credora",  classe: 8, parent: "83",    locked: true },
  { code: "83.2",   name: "Custos e perdas financeiros gerais",                                type: "movimento",  nature: "devedora", classe: 8, parent: "83",    locked: true },
  { code: "83.9",   name: "Transferência para resultados líquidos",                            type: "movimento",  nature: "credora",  classe: 8, parent: "83",    locked: true },
  { code: "84",     name: "Resultados financeiros em filiais e associadas",                    type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "84.1",   name: "Proveitos e ganhos em filiais e associadas",                        type: "movimento",  nature: "credora",  classe: 8, parent: "84",    locked: true },
  { code: "84.2",   name: "Custos e perdas em filiais e associadas",                           type: "movimento",  nature: "devedora", classe: 8, parent: "84",    locked: true },
  { code: "84.9",   name: "Transferência para resultados líquidos",                            type: "movimento",  nature: "credora",  classe: 8, parent: "84",    locked: true },
  { code: "85",     name: "Resultados não operacionais",                                       type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "85.1",   name: "Proveitos e ganhos não operacionais",                               type: "movimento",  nature: "credora",  classe: 8, parent: "85",    locked: true },
  { code: "85.2",   name: "Custos e perdas não operacionais",                                  type: "movimento",  nature: "devedora", classe: 8, parent: "85",    locked: true },
  { code: "85.9",   name: "Transferência para resultados líquidos",                            type: "movimento",  nature: "credora",  classe: 8, parent: "85",    locked: true },
  { code: "86",     name: "Resultados extraordinários",                                        type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "86.1",   name: "Proveitos e ganhos extraordinários",                                type: "movimento",  nature: "credora",  classe: 8, parent: "86",    locked: true },
  { code: "86.2",   name: "Custos e perdas extraordinários",                                   type: "movimento",  nature: "devedora", classe: 8, parent: "86",    locked: true },
  { code: "86.9",   name: "Transferência para resultados líquidos",                            type: "movimento",  nature: "credora",  classe: 8, parent: "86",    locked: true },
  { code: "87",     name: "Impostos sobre os lucros",                                          type: "acumulacao", nature: "devedora", classe: 8, parent: "8",     locked: true },
  { code: "87.1",   name: "Imposto sobre os resultados correntes",                             type: "movimento",  nature: "devedora", classe: 8, parent: "87",    locked: true },
  { code: "87.2",   name: "Imposto sobre os resultados extraordinários",                       type: "movimento",  nature: "devedora", classe: 8, parent: "87",    locked: true },
  { code: "87.9",   name: "Transferência para resultados líquidos",                            type: "movimento",  nature: "devedora", classe: 8, parent: "87",    locked: true },
  { code: "88",     name: "Resultado líquido do exercício",                                    type: "acumulacao", nature: "credora",  classe: 8, parent: "8",     locked: true },
  { code: "88.1",   name: "Resultados operacionais",                                           type: "movimento",  nature: "credora",  classe: 8, parent: "88",    locked: true },
  { code: "88.2",   name: "Resultados financeiros gerais",                                     type: "movimento",  nature: "credora",  classe: 8, parent: "88",    locked: true },
  { code: "88.3",   name: "Resultados em filiais e associadas",                                type: "movimento",  nature: "credora",  classe: 8, parent: "88",    locked: true },
  { code: "88.4",   name: "Resultados não operacionais",                                       type: "movimento",  nature: "credora",  classe: 8, parent: "88",    locked: true },
  { code: "88.5",   name: "Imposto sobre os resultados correntes",                             type: "movimento",  nature: "devedora", classe: 8, parent: "88",    locked: true },
  { code: "88.6",   name: "Resultados extraordinários",                                        type: "movimento",  nature: "credora",  classe: 8, parent: "88",    locked: true },
  { code: "88.7",   name: "Imposto sobre os resultados extraordinários",                       type: "movimento",  nature: "devedora", classe: 8, parent: "88",    locked: true },
  { code: "88.9",   name: "Transferência para resultados transitados",                         type: "movimento",  nature: "credora",  classe: 8, parent: "88",    locked: true },
  { code: "89",     name: "Dividendos antecipados",                                            type: "acumulacao", nature: "devedora", classe: 8, parent: "8",     locked: true },
  { code: "89.9",   name: "Transferência para resultados transitados",                         type: "movimento",  nature: "devedora", classe: 8, parent: "89",    locked: true },

  // ── CLASSE 9 — CONTABILIDADE ANALÍTICA (FACULTATIVA) ─────────────────
  { code: "9",  name: "Contabilidade Analítica (Facultativa)",                     type: "classe",     nature: "devedora", classe: 9, locked: true },
  { code: "91", name: "Custos por Natureza Reflectidos",                           type: "acumulacao", nature: "devedora", classe: 9, parent: "9",    locked: true },
  { code: "92", name: "Centros de Análise",                                        type: "acumulacao", nature: "devedora", classe: 9, parent: "9",    locked: true },
  { code: "93", name: "Custos de Produção",                                        type: "acumulacao", nature: "devedora", classe: 9, parent: "9",    locked: true },
  { code: "94", name: "Artigos em Processamento",                                  type: "acumulacao", nature: "devedora", classe: 9, parent: "9",    locked: true },
  { code: "95", name: "Artigos Acabados",                                          type: "acumulacao", nature: "devedora", classe: 9, parent: "9",    locked: true },
  { code: "97", name: "Margens e Resultados Analíticos",                           type: "acumulacao", nature: "credora",  classe: 9, parent: "9",    locked: true },
  { code: "98", name: "Diferenças de Incorporação",                                type: "acumulacao", nature: "devedora", classe: 9, parent: "9",    locked: true },
  { code: "99", name: "Contas Reflectidas",                                        type: "acumulacao", nature: "credora",  classe: 9, parent: "9",    locked: true },
];

const CLASSE_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",   label: "Meios Fixos" },
  2: { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200",  label: "Existências" },
  3: { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200", label: "Terceiros" },
  4: { bg: "bg-cyan-50",    text: "text-cyan-700",   border: "border-cyan-200",   label: "Meios Monetários" },
  5: { bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-200", label: "Capital" },
  6: { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200",label: "Proveitos" },
  7: { bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200",    label: "Custos" },
  8: { bg: "bg-slate-50",   text: "text-slate-700",  border: "border-slate-200",  label: "Resultados" },
  9: { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  label: "Analítica" },
};

function buildTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>();
  const roots: Account[] = [];
  accounts.forEach((a) => map.set(a.code, { ...a, children: [] }));
  map.forEach((a) => {
    if (a.parent && map.has(a.parent)) {
      map.get(a.parent)!.children!.push(a);
    } else if (!a.parent) {
      roots.push(a);
    }
  });
  return roots;
}

function flattenMatch(accounts: Account[], query: string): string[] {
  const q = query.toLowerCase();
  const matched = new Set<string>();
  function walk(a: Account) {
    if (a.code.startsWith(query) || a.name.toLowerCase().includes(q)) {
      matched.add(a.code);
      // add all ancestors
      let p = a.parent;
      while (p) {
        matched.add(p);
        const parent = accounts.find((x) => x.code === p);
        p = parent?.parent;
      }
    }
    (a.children || []).forEach(walk);
  }
  accounts.forEach(walk);
  return [...matched];
}

function countDescendants(a: Account): number {
  if (!a.children?.length) return 0;
  return a.children.length + a.children.reduce((s, c) => s + countDescendants(c), 0);
}

// ── Modal de criação / edição ─────────────────────────────────────────────────
interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  parentCode?: string;
  account?: Account;
}

const EMPTY_FORM = {
  code: "", name: "", type: "movimento" as AccountType,
  nature: "devedora" as NatureType, description: "", iva: false,
};

// ── Account Row (recursive) ────────────────────────────────────────────────────
function AccountRow({
  account,
  depth,
  expanded,
  onToggle,
  visible,
  onEdit,
  onDelete,
  onAddChild,
}: {
  account: Account;
  depth: number;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  visible: Set<string> | null;
  onEdit: (a: Account) => void;
  onDelete: (a: Account) => void;
  onAddChild: (parentCode: string) => void;
}) {
  if (visible && !visible.has(account.code)) return null;
  const hasChildren = (account.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(account.code);
  const col = CLASSE_COLORS[account.classe];

  return (
    <>
      <tr className="group hover:bg-ink-50/50 transition-colors">
        <td className="px-3 py-2.5 border-t border-ink-100">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 18}px` }}>
            <button
              onClick={() => hasChildren && onToggle(account.code)}
              className="w-5 h-5 flex items-center justify-center mr-1.5 shrink-0 rounded text-ink-400 hover:text-ink-700 transition-colors"
            >
              {hasChildren ? (isExpanded ? "▾" : "▸") : <span className="w-1.5 h-1.5 rounded-full bg-ink-200 inline-block" />}
            </button>
            <span
              className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${col.bg} ${col.text} border ${col.border}`}
            >
              {account.code}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 border-t border-ink-100">
          <span className={`text-sm font-medium ${depth === 0 ? "text-ink-900 font-bold" : depth === 1 ? "text-ink-800" : "text-ink-700"}`}>
            {account.name}
          </span>
          {account.iva && (
            <span className="ml-2 text-[10px] font-bold px-1 py-0.5 bg-aqua-100 text-aqua-700 rounded">IVA</span>
          )}
          {account.isCustom && (
            <span className="ml-2 text-[10px] font-bold px-1 py-0.5 bg-gold-100 text-gold-700 rounded">personaliz.</span>
          )}
        </td>
        <td className="px-3 py-2.5 border-t border-ink-100 text-center">
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            account.type === "classe" ? "bg-ink-200 text-ink-600" :
            account.type === "acumulacao" ? "bg-blue-100 text-blue-700" :
            "bg-green-100 text-green-700"
          }`}>
            {account.type === "classe" ? "Classe" : account.type === "acumulacao" ? "Acumulação" : "Movimento"}
          </span>
        </td>
        <td className="px-3 py-2.5 border-t border-ink-100 text-center">
          <span className={`text-xs font-semibold ${account.nature === "devedora" ? "text-brand-600" : "text-green-600"}`}>
            {account.nature === "devedora" ? "D" : "C"}
          </span>
        </td>
        <td className="px-3 py-2.5 border-t border-ink-100 text-right text-xs text-ink-400">
          {hasChildren ? countDescendants(account) : "—"}
        </td>
        <td className="px-3 py-2.5 border-t border-ink-100">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAddChild(account.code)}
              title="Adicionar subconta"
              className="p-1 rounded hover:bg-aqua-100 text-ink-400 hover:text-aqua-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(account)}
              title="Editar conta"
              className="p-1 rounded hover:bg-gold-100 text-ink-400 hover:text-gold-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {!account.locked && (
              <button
                onClick={() => onDelete(account)}
                title="Eliminar conta"
                className="p-1 rounded hover:bg-brand-100 text-ink-400 hover:text-brand-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && account.children?.map((child) => (
        <AccountRow
          key={child.code}
          account={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          visible={visible}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </>
  );
}

// ── Account Form Modal ────────────────────────────────────────────────────────
function AccountFormModal({
  mode, parentCode, account: editAccount, allAccounts,
  onClose, onSave,
}: {
  mode: "create" | "edit";
  parentCode?: string;
  account?: Account;
  allAccounts: Account[];
  onClose: () => void;
  onSave: (mode: "create" | "edit", form: typeof EMPTY_FORM, parentCode?: string, account?: Account) => void;
}) {
  const parent = parentCode ? allAccounts.find((a) => a.code === parentCode) : undefined;
  const [form, setForm] = useState(
    editAccount
      ? { code: editAccount.code, name: editAccount.name, type: editAccount.type,
          nature: editAccount.nature, description: editAccount.description ?? "", iva: editAccount.iva ?? false }
      : { ...EMPTY_FORM, code: parentCode ? parentCode + "1" : "", nature: parent?.nature ?? "devedora" as NatureType }
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {parentCode && (
          <p className="text-xs text-ink-400">
            Subconta de: <strong className="text-aqua-600 font-mono">{parentCode}</strong>{" "}
            {allAccounts.find((a) => a.code === parentCode)?.name}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código da Conta *</label>
            <input
              className="input font-mono"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder={parentCode ? `${parentCode}1` : "ex: 3111"}
              disabled={mode === "edit"}
            />
            {parentCode && (
              <p className="text-[11px] text-ink-400 mt-1">
                Deve começar com <strong className="font-mono">{parentCode}</strong>
              </p>
            )}
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
            >
              <option value="movimento">Movimento</option>
              <option value="acumulacao">Acumulação</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Designação *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome descritivo da conta"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Natureza *</label>
            <select
              className="input"
              value={form.nature}
              onChange={(e) => setForm({ ...form, nature: e.target.value as NatureType })}
            >
              <option value="devedora">Devedora (activo / custo)</option>
              <option value="credora">Credora (passivo / proveito)</option>
            </select>
          </div>
          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                checked={form.iva}
                onChange={(e) => setForm({ ...form, iva: e.target.checked })}
              />
              <span className="text-sm font-medium text-ink-700">Conta de IVA</span>
            </label>
            <p className="text-[11px] text-ink-400 mt-1 ml-6">Inclui no apuramento do IVA</p>
          </div>
        </div>

        <div>
          <label className="label">Descrição / Notas</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Uso e características desta conta..."
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-ink-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button
          onClick={() => onSave(mode, form, parentCode, editAccount)}
          disabled={!form.code.trim() || !form.name.trim()}
          className="btn-primary"
        >
          {mode === "create" ? "Criar Conta" : "Guardar Alterações"}
        </button>
      </div>
    </div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────────────────────
function DeleteAccountModal({ account, onClose, onConfirm }: {
  account: Account;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-ink-500">
          Tem a certeza que deseja eliminar a conta{" "}
          <strong className="font-mono text-brand-600">{account.code}</strong>{" "}
          <em>{account.name}</em>?
        </p>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirm} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-all">
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlanoContasPage() {
  const [allAccounts, setAllAccounts] = useState<Account[]>(PGCA_ACCOUNTS);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["1","2","3","4","5","6","7","8","9"]));
  const [search, setSearch] = useState("");
  const [filterClasse, setFilterClasse] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [showStats, setShowStats] = useState(false);
  const { openWindow, closeWindow } = useWindowManager();

  const tree = useMemo(() => {
    let filtered = allAccounts;
    if (filterClasse) filtered = filtered.filter((a) => a.classe === filterClasse);
    if (filterType) filtered = filtered.filter((a) => a.type === filterType);
    return buildTree(filtered);
  }, [allAccounts, filterClasse, filterType]);

  const visibleCodes = useMemo<Set<string> | null>(() => {
    if (!search.trim()) return null;
    const flat = flattenMatch(tree, search.trim());
    return flat.length > 0 ? new Set(flat) : new Set();
  }, [search, tree]);

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(allAccounts.map((a) => a.code)));
  }

  function collapseAll() {
    setExpanded(new Set(["1","2","3","4","5","6","7","8","9"]));
  }

  function handleSaveAccount(mode: "create" | "edit", form: typeof EMPTY_FORM, parentCode?: string, editAccount?: Account) {
    if (!form.code.trim() || !form.name.trim()) return;

    if (mode === "create") {
      if (allAccounts.find((a) => a.code === form.code.trim())) {
        alert("Já existe uma conta com esse código.");
        return;
      }
      const parent = parentCode ? allAccounts.find((a) => a.code === parentCode) : undefined;
      const newAccount: Account = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        nature: form.nature,
        classe: parent?.classe ?? 9,
        parent: parentCode,
        description: form.description,
        iva: form.iva,
        isCustom: true,
      };
      setAllAccounts((prev) => [...prev, newAccount]);
      if (parentCode) {
        setExpanded((prev) => new Set([...prev, parentCode]));
      }
    } else if (mode === "edit" && editAccount) {
      setAllAccounts((prev) =>
        prev.map((a) =>
          a.code === editAccount.code
            ? { ...a, name: form.name.trim(), type: form.type, nature: form.nature, description: form.description, iva: form.iva }
            : a
        )
      );
    }
  }

  function openCreate(parentCode?: string) {
    const winId = `nova-conta-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Nova Conta", icon: "➕",
      content: <AccountFormModal
        mode="create" parentCode={parentCode} allAccounts={allAccounts}
        onClose={() => closeWindow(winId)}
        onSave={(mode, form, pc, acc) => { handleSaveAccount(mode, form, pc, acc); closeWindow(winId); }}
      />,
      x: 40, y: 20, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function openEdit(account: Account) {
    const winId = `editar-conta-${account.code}`;
    openWindow({
      id: winId, title: `Editar Conta — ${account.code}`, icon: "✏️",
      content: <AccountFormModal
        mode="edit" account={account} allAccounts={allAccounts}
        onClose={() => closeWindow(winId)}
        onSave={(mode, form, pc, acc) => { handleSaveAccount(mode, form, pc, acc); closeWindow(winId); }}
      />,
      x: 60, y: 40, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function confirmDelete(account: Account) {
    const hasChildren = allAccounts.some((a) => a.parent === account.code);
    if (hasChildren) {
      alert("Esta conta tem subcontas. Elimine primeiro as subcontas.");
      return;
    }
    const winId = `delete-conta-${account.code}`;
    openWindow({
      id: winId, title: "Eliminar Conta", icon: "⚠️",
      content: <DeleteAccountModal
        account={account}
        onClose={() => closeWindow(winId)}
        onConfirm={() => { setAllAccounts((prev) => prev.filter((a) => a.code !== account.code)); closeWindow(winId); }}
      />,
      x: 80, y: 60, width: 480, height: 240, minimized: false, maximized: false,
    });
  }

  const stats = useMemo(() => ({
    total: allAccounts.length,
    custom: allAccounts.filter((a) => a.isCustom).length,
    movement: allAccounts.filter((a) => a.type === "movimento").length,
    devedora: allAccounts.filter((a) => a.nature === "devedora").length,
    credora: allAccounts.filter((a) => a.nature === "credora").length,
    byClasse: [1,2,3,4,5,6,7,8,9].map((c) => ({
      c, count: allAccounts.filter((a) => a.classe === c).length
    })),
  }), [allAccounts]);

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <span className="text-2xl font-bold text-ink-900">Plano Geral de Contabilidade</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">PGCA Angola</span>
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">Decreto n.º 82/01 · {stats.total} contas · {stats.custom} personalizadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStats(!showStats)} className="btn-secondary text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Estatísticas
          </button>
          <button
            onClick={() => openCreate()}
            className="btn-primary text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Conta
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="card mb-6 p-5">
          <h3 className="font-semibold text-ink-800 mb-4">Distribuição por Classe</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {stats.byClasse.map(({ c, count }) => {
              const col = CLASSE_COLORS[c];
              return (
                <button
                  key={c}
                  onClick={() => setFilterClasse(filterClasse === c ? null : c)}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    filterClasse === c ? `${col.border} ${col.bg}` : "border-ink-200 hover:border-ink-300"
                  }`}
                >
                  <p className={`text-2xl font-bold ${col.text}`}>{c}</p>
                  <p className="text-[11px] font-bold text-ink-500 mt-0.5">{count}</p>
                  <p className={`text-[10px] ${col.text} mt-0.5 hidden lg:block`}>{col.label}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-6 text-sm text-ink-500">
            <span><strong className="text-ink-800">{stats.movement}</strong> contas de movimento</span>
            <span><strong className="text-brand-600">{stats.devedora}</strong> natureza devedora</span>
            <span><strong className="text-green-600">{stats.credora}</strong> natureza credora</span>
            <span><strong className="text-gold-600">{stats.custom}</strong> personalizadas</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="input pl-9 text-sm"
              placeholder="Pesquisar código ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input text-sm w-auto"
            value={filterClasse ?? ""}
            onChange={(e) => setFilterClasse(e.target.value ? +e.target.value : null)}
          >
            <option value="">Todas as classes</option>
            {[1,2,3,4,5,6,7,8,9].map((c) => (
              <option key={c} value={c}>Classe {c} — {CLASSE_COLORS[c].label}</option>
            ))}
          </select>
          <select
            className="input text-sm w-auto"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="classe">Classe</option>
            <option value="acumulacao">Acumulação</option>
            <option value="movimento">Movimento</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={expandAll} className="btn-ghost text-xs">
              Expandir tudo
            </button>
            <button onClick={collapseAll} className="btn-ghost text-xs">
              Colapsar
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {[1,2,3,4,5,6,7,8,9].map((c) => {
          const col = CLASSE_COLORS[c];
          return (
            <button
              key={c}
              onClick={() => setFilterClasse(filterClasse === c ? null : c)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-all px-2 py-1 rounded-md ${
                filterClasse === c ? `${col.bg} ${col.text} ring-1 ${col.border}` : "text-ink-500 hover:text-ink-700"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${col.bg} border ${col.border}`} />
              <span>C{c}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th className="w-36">Código</th>
              <th>Designação</th>
              <th className="w-32 text-center">Tipo</th>
              <th className="w-16 text-center">Nat.</th>
              <th className="w-20 text-right">Subcontas</th>
              <th className="w-28 text-right">Acções</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((account) => (
              <AccountRow
                key={account.code}
                account={account}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                visible={visibleCodes}
                onEdit={openEdit}
                onDelete={confirmDelete}
                onAddChild={openCreate}
              />
            ))}
            {visibleCodes?.size === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-400 text-sm">
                  Nenhuma conta encontrada para "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PGCA Notice */}
      <div className="mt-4 p-4 rounded-xl border border-gold-200 bg-gold-50 flex items-start gap-3">
        <svg className="w-5 h-5 text-gold-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm">
          <p className="font-semibold text-gold-800">Plano Geral de Contabilidade de Angola (PGCA)</p>
          <p className="text-gold-700 mt-0.5">
            As contas base (Decreto n.º 82/01) são protegidas e não podem ser eliminadas.
            Pode criar subcontas personalizadas dentro de qualquer conta de acumulação ou classe.
            Contas de movimento são as únicas que recebem lançamentos directos no diário.
          </p>
        </div>
      </div>

    </div>
  );
}
