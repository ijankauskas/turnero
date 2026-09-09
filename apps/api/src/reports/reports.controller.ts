import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reports')
@Roles('ADMINISTRADOR', 'ENCARGADO')
export class ReportsController {
  @Get('professionals')
  professionals() {
    return { items: [], pending: 'RPT-001' };
  }
}
