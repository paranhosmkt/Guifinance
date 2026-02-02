
import { Transaction, TransactionType, CategoryGroup, Category } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const CATEGORIES: Category[] = [
  { name: 'Vendas Diretas', group: CategoryGroup.REVENUE, subCategories: ['Produtos', 'Assinaturas'] },
  { name: 'Serviços', group: CategoryGroup.REVENUE, subCategories: ['Consultoria', 'Suporte'] },
  { name: 'Infraestrutura', group: CategoryGroup.COGS, subCategories: ['Servidores', 'Domínios'] },
  { name: 'Folha de Pagamento', group: CategoryGroup.OPERATING_EXPENSE, subCategories: ['Salários', 'Encargos', 'Bônus'] },
  { name: 'Aluguel & Escritório', group: CategoryGroup.OPERATING_EXPENSE, subCategories: ['Aluguel', 'Energia', 'Internet'] },
  { name: 'Publicidade', group: CategoryGroup.OPERATING_EXPENSE, subCategories: ['Google Ads', 'Meta Ads'] },
  { name: 'Impostos', group: CategoryGroup.OPERATING_EXPENSE, subCategories: ['DAS', 'ISS', 'IRPJ'] },
  { name: 'Juros & Taxas', group: CategoryGroup.FINANCIAL, subCategories: ['Taxas Bancárias', 'Juros Cartão'] }
];
