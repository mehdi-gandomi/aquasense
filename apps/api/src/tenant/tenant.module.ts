import { Global, Module, forwardRef } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { AdminController } from './admin.controller';
import { PlantModule } from '../plant/plant.module';

@Global()
@Module({
  imports: [forwardRef(() => PlantModule)],
  providers: [TenantService],
  controllers: [AdminController],
  exports: [TenantService],
})
export class TenantModule {}
