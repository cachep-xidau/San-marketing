import { Module } from '@nestjs/common';
import { DataSyncService } from './data-sync.service';

@Module({
    providers: [DataSyncService],
    exports: [DataSyncService],
})
export class DataSyncModule { }
