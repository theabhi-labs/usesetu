import { WebsiteSetting } from '../../models/websiteSetting.model';
import { tenantLocalStorage } from '../tenantContext.service';

export interface ITemplateInitializer {
  initialize(params: {
    tenantId: string;
    applicationId: string;
    name: string;
    slug: string;
  }): Promise<void>;
}

export class DigitalServiceCenterInitializer implements ITemplateInitializer {
  async initialize(params: {
    tenantId: string;
    applicationId: string;
    name: string;
    slug: string;
  }): Promise<void> {
    const { tenantId, name } = params;

    await tenantLocalStorage.run({ tenantId }, async () => {
      await WebsiteSetting.findOneAndUpdate(
        { _id: tenantId },
        {
          $setOnInsert: {
            _id: tenantId,
            websiteName: name,
            cscName: name,
            tagline: 'Your Trusted Digital Services Partner',
            description: `Official digital service center portal for ${name}.`,
            theme: {
              primaryColor: '#FF6700',
              secondaryColor: '#0D0D0D',
              accentColor: '#FFB800',
              borderRadius: '8px',
              fontFamily: 'Inter, sans-serif',
            },
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    });
  }
}

const templateInitializers: Record<string, ITemplateInitializer> = {
  'digital-service-center': new DigitalServiceCenterInitializer(),
  digital_service_center: new DigitalServiceCenterInitializer(),
};

export const getTemplateInitializer = (key: string): ITemplateInitializer => {
  return templateInitializers[key] || new DigitalServiceCenterInitializer();
};
