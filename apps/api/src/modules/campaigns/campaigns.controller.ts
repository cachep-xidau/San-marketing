import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Get()
    async findAll(@Query('channel') channel?: string, @Query('status') status?: string) {
        return this.campaignsService.findAll({ channel, status });
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.campaignsService.findById(id);
    }

    @Post()
    async create(@Body() data: any) {
        return this.campaignsService.create(data);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return { message: `Campaign ${id} updated` };
    }

    @Post(':id/goals')
    async setGoals(@Param('id') id: string, @Body() goals: any) {
        return { message: `Goals set for campaign ${id}` };
    }

    @Get(':id/metrics')
    async getMetrics(@Param('id') id: string) {
        return { message: `Metrics for campaign ${id}` };
    }
}
