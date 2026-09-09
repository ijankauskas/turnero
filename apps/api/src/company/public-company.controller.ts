import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public')
export class PublicCompanyController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('company/:slug')
  async bySlug(@Param('slug') slug: string) {
    const company = await this.prisma.company.findFirst({
      where: { slug, active: true, deletedAt: null },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return company;
  }
}
