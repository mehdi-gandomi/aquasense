import { Global, Module, forwardRef } from '@nestjs/common';
import { PlantService } from './plant.service';
import { PlantController } from './plant.controller';
import { TenantModule } from '../tenant/tenant.module';

@Global()
@Module({
  imports: [forwardRef(() => TenantModule)],
  providers: [PlantService],
  controllers: [PlantController],
  exports: [PlantService],
})
export class PlantModule {}
