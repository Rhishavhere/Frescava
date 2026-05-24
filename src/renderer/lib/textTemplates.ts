import type { TypographyTemplate } from '@shared/types'

export const TYPOGRAPHY_TEMPLATES: TypographyTemplate[] = [
  {
    id: 'stories',
    name: 'Stories',
    thumbnailText: 'Stories',
    layers: [
      {
        text: 'EST. 2026',
        fontFamily: 'Montserrat',
        fontSize: 2.2,
        fontWeight: '500',
        fontStyle: 'normal',
        color: '#FFFFFF',
        opacity: 0.9,
        letterSpacing: 0.4,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 38 },
        textCase: 'uppercase'
      },
      {
        text: 'Stories',
        fontFamily: 'Playfair Display',
        fontSize: 9.0,
        fontWeight: '400',
        fontStyle: 'italic',
        color: '#FFFFFF',
        opacity: 1.0,
        letterSpacing: 0.05,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 50 },
        textCase: 'none'
      }
    ]
  },
  {
    id: 'moment',
    name: 'Moment',
    thumbnailText: 'THE MOMENT',
    layers: [
      {
        text: 'THE MOMENT',
        fontFamily: 'KenokyLight',
        fontSize: 4.5,
        fontWeight: '300',
        fontStyle: 'normal',
        color: '#FFFFFF',
        opacity: 1.0,
        letterSpacing: 0.25,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 46 },
        textCase: 'uppercase',
        decoLeftRight: 'star'
      },
      {
        text: 'capturing the essence of light',
        fontFamily: 'Cormorant Garamond',
        fontSize: 2.5,
        fontWeight: '400',
        fontStyle: 'italic',
        color: '#E4E4E7',
        opacity: 0.9,
        letterSpacing: 0.1,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 55 },
        textCase: 'none'
      }
    ]
  },
  {
    id: 'somewhere',
    name: 'Somewhere',
    thumbnailText: 'SOMEWHERE',
    layers: [
      {
        text: 'SOMEWHERE',
        fontFamily: 'Cinzel',
        fontSize: 7.5,
        fontWeight: '400',
        fontStyle: 'normal',
        color: '#FFFFFF',
        opacity: 1.0,
        letterSpacing: 0.5,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 44 },
        textCase: 'uppercase'
      },
      {
        text: 'LOST IN THE RIGHT DIRECTION',
        fontFamily: 'Montserrat',
        fontSize: 1.8,
        fontWeight: '300',
        fontStyle: 'normal',
        color: '#D4D4D8',
        opacity: 0.9,
        letterSpacing: 0.3,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 53 },
        textCase: 'uppercase'
      }
    ]
  },
  {
    id: 'hopping',
    name: 'Hopping',
    thumbnailText: 'HOPPING',
    layers: [
      {
        text: 'WEEKEND HOPPING',
        fontFamily: 'CoffekanRegular',
        fontSize: 3.2,
        fontWeight: '700',
        fontStyle: 'normal',
        color: '#18181B',
        opacity: 1.0,
        letterSpacing: 0.15,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 50 },
        textCase: 'uppercase',
        border: {
          enabled: true,
          type: 'pill',
          paddingX: 3.5,
          paddingY: 1.2,
          color: '#FFFFFF',
          width: 1
        }
      }
    ]
  },
  {
    id: 'fairway',
    name: 'Fairway',
    thumbnailText: 'Fairway',
    layers: [
      {
        text: 'the fairway',
        fontFamily: 'Bodoni Moda',
        fontSize: 9.0,
        fontWeight: '400',
        fontStyle: 'italic',
        color: '#FFFFFF',
        opacity: 1.0,
        letterSpacing: -0.02,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 45 },
        textCase: 'none'
      },
      {
        text: 'AUTUMN / WINTER COLLECTION',
        fontFamily: 'Inter',
        fontSize: 1.8,
        fontWeight: '500',
        fontStyle: 'normal',
        color: '#A1A1AA',
        opacity: 0.9,
        letterSpacing: 0.4,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 55 },
        textCase: 'uppercase'
      }
    ]
  }
]
