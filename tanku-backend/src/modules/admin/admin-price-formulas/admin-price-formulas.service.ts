import { prisma } from '../../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../shared/errors/AppError';
import { PriceFormulaType } from '@prisma/client';
import { PriceFormulaValue } from '../../../shared/utils/price-formula.utils';

export interface PriceFormulaListItem {
  id: string;
  name: string;
  type: PriceFormulaType;
  value: PriceFormulaValue;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePriceFormulaInput {
  name: string;
  type: PriceFormulaType;
  value: PriceFormulaValue;
  description?: string | null;
  isDefault?: boolean;
}

export interface UpdatePriceFormulaInput {
  name?: string;
  type?: PriceFormulaType;
  value?: PriceFormulaValue;
  description?: string | null;
  isDefault?: boolean;
}

export class AdminPriceFormulaService {
  /**
   * Listar todas las fórmulas de precio
   */
  async getPriceFormulas(): Promise<PriceFormulaListItem[]> {
    const formulas = await prisma.priceFormula.findMany({
      orderBy: [
        { isDefault: 'desc' }, // Fórmulas por defecto primero
        { createdAt: 'desc' },
      ],
    });

    return formulas.map((formula) => ({
      id: formula.id,
      name: formula.name,
      type: formula.type,
      value: formula.value as PriceFormulaValue,
      description: formula.description,
      isDefault: formula.isDefault,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
    }));
  }

  /**
   * Obtener fórmula por ID
   */
  async getPriceFormulaById(id: string): Promise<PriceFormulaListItem> {
    const formula = await prisma.priceFormula.findUnique({
      where: { id },
    });

    if (!formula) {
      throw new NotFoundError('Fórmula de precio no encontrada');
    }

    return {
      id: formula.id,
      name: formula.name,
      type: formula.type,
      value: formula.value as PriceFormulaValue,
      description: formula.description,
      isDefault: formula.isDefault,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
    };
  }

  /**
   * Crear nueva fórmula de precio
   */
  async createPriceFormula(input: CreatePriceFormulaInput, userRole?: string): Promise<PriceFormulaListItem> {
    // Validar que el nombre sea único
    const existing = await prisma.priceFormula.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new BadRequestError('Ya existe una fórmula con ese nombre');
    }

    // Validar valores según el tipo
    this.validateFormulaValue(input.type, input.value);

    // Solo SUPER_ADMIN puede marcar fórmulas como predeterminadas
    if (input.isDefault && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Solo SUPER_ADMIN puede marcar fórmulas como predeterminadas');
    }

    // Si se marca como default, desmarcar las demás
    if (input.isDefault) {
      await prisma.priceFormula.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const formula = await prisma.priceFormula.create({
      data: {
        name: input.name,
        type: input.type,
        value: input.value as any, // Prisma JSON type
        description: input.description || null,
        isDefault: input.isDefault || false,
      },
    });

    return {
      id: formula.id,
      name: formula.name,
      type: formula.type,
      value: formula.value as PriceFormulaValue,
      description: formula.description,
      isDefault: formula.isDefault,
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
    };
  }

  /**
   * Actualizar fórmula de precio
   */
  async updatePriceFormula(
    id: string,
    input: UpdatePriceFormulaInput,
    userRole?: string
  ): Promise<PriceFormulaListItem> {
    const formula = await prisma.priceFormula.findUnique({
      where: { id },
    });

    if (!formula) {
      throw new NotFoundError('Fórmula de precio no encontrada');
    }

    // Solo SUPER_ADMIN puede marcar/desmarcar fórmulas como predeterminadas
    if (input.isDefault !== undefined && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Solo SUPER_ADMIN puede cambiar el estado de fórmula predeterminada');
    }

    // Si se cambia el nombre, validar que sea único
    if (input.name && input.name !== formula.name) {
      const existing = await prisma.priceFormula.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new BadRequestError('Ya existe una fórmula con ese nombre');
      }
    }

    // Validar valores si se actualiza el tipo o el valor
    if (input.type || input.value) {
      const type = input.type || formula.type;
      const value = input.value || (formula.value as PriceFormulaValue);
      this.validateFormulaValue(type, value);
    }

    // Si se marca como default, desmarcar las demás
    if (input.isDefault === true) {
      await prisma.priceFormula.updateMany({
        where: {
          isDefault: true,
          id: { not: id }, // Excluir la actual
        },
        data: { isDefault: false },
      });
    }

    const updatedFormula = await prisma.priceFormula.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.type && { type: input.type }),
        ...(input.value && { value: input.value as any }), // Prisma JSON type
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });

    return {
      id: updatedFormula.id,
      name: updatedFormula.name,
      type: updatedFormula.type,
      value: updatedFormula.value as PriceFormulaValue,
      description: updatedFormula.description,
      isDefault: updatedFormula.isDefault,
      createdAt: updatedFormula.createdAt,
      updatedAt: updatedFormula.updatedAt,
    };
  }

  /**
   * Eliminar fórmula de precio
   */
  async deletePriceFormula(id: string): Promise<void> {
    const formula = await prisma.priceFormula.findUnique({
      where: { id },
    });

    if (!formula) {
      throw new NotFoundError('Fórmula de precio no encontrada');
    }

    // No permitir eliminar la fórmula predeterminada
    if (formula.isDefault) {
      throw new BadRequestError('No se puede eliminar la fórmula predeterminada. Primero marca otra fórmula como predeterminada.');
    }

    // Verificar si hay productos usando esta fórmula
    // Nota: La comparación de JSON en Prisma es compleja, usamos una búsqueda más simple
    const productsUsingFormula = await prisma.product.count({
      where: {
        priceFormulaType: formula.type,
        // No podemos comparar directamente JSON, así que solo verificamos el tipo
        // Si hay productos con este tipo, asumimos que podrían estar usando esta fórmula
      },
    });

    if (productsUsingFormula > 0) {
      throw new BadRequestError(
        `No se puede eliminar la fórmula porque ${productsUsingFormula} producto(s) la están usando`
      );
    }

    await prisma.priceFormula.delete({
      where: { id },
    });
  }

  /**
   * Validar valores de fórmula según el tipo
   */
  private validateFormulaValue(type: PriceFormulaType, value: PriceFormulaValue): void {
    switch (type) {
      case PriceFormulaType.PERCENTAGE:
        if (value.percentage === undefined || value.percentage < 0) {
          throw new BadRequestError('El porcentaje debe ser un número positivo');
        }
        break;

      case PriceFormulaType.FIXED:
        if (value.fixed === undefined || value.fixed < 0) {
          throw new BadRequestError('El monto fijo debe ser un número positivo');
        }
        break;

      case PriceFormulaType.MIN_MARGIN:
        if (value.minMargin === undefined || value.minMargin < 0) {
          throw new BadRequestError('El margen mínimo debe ser un número positivo');
        }
        break;

      case PriceFormulaType.STANDARD:
        // No requiere valores adicionales
        break;

      default:
        throw new BadRequestError('Tipo de fórmula no válido');
    }
  }
}

