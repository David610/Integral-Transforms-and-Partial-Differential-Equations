/**
 * Browser-Polyfills für Node-Globals.
 *
 * @react-pdf/pdfkit (vom PDF-Export genutzt) referenziert das globale `Buffer`,
 * das im Browser nicht existiert. Ohne diesen Polyfill wirft `pdf().toBlob()`
 * einen `ReferenceError: Buffer is not defined`, sodass kein PDF erzeugt wird.
 *
 * Muss vor dem ersten Laden des PDF-Codes ausgeführt werden – daher als
 * allererster Import in `main.tsx` eingebunden.
 */

import { Buffer } from 'buffer';

const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer };

if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}
