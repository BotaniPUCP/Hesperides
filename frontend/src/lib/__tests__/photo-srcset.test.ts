import { photoSrcSet } from '../photo-srcset';

describe('photoSrcSet', () => {
  it('ofrece la miniatura y la versión completa de la misma foto', () => {
    expect(photoSrcSet('http://api/v1/files/places/9?size=thumb')).toBe(
      'http://api/v1/files/places/9?size=thumb 400w, http://api/v1/files/places/9?size=full 1600w',
    );
  });
});
