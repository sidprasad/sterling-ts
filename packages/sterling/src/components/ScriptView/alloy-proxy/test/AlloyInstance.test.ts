/**
 * @jest-environment jsdom
 */

import { AlloyInstance } from '../AlloyInstance';

describe('AlloyInstance proxy naming', () => {
    it('disambiguates a later atom that collides with an existing signature name', () => {
        const xml = `
<alloy>
  <instance bitwidth="4" command="run {}" filename="collision.als" maxseq="4">
    <sig label="seq/Int" ID="0" parentID="1" builtin="yes"></sig>
    <sig label="Int" ID="1" parentID="2" builtin="yes"></sig>
    <sig label="univ" ID="2" builtin="yes"></sig>
    <sig label="Foo0" ID="3" parentID="2"></sig>
    <sig label="Bar" ID="4" parentID="2">
      <atom label="Foo0"/>
    </sig>
  </instance>
</alloy>`;

        const instance = new AlloyInstance(xml);
        const atom = instance.atom('Foo0');
        const signature = instance.signature('Foo0');

        expect(atom).not.toBeNull();
        expect(signature).not.toBeNull();
        expect(Reflect.get(atom!, '__var__')).toBe('Foo0$atom');
        expect(Reflect.get(signature!, '__var__')).toBe('Foo0');
    });

    it('disambiguates a later signature that collides with an existing atom name', () => {
        const xml = `
<alloy>
  <instance bitwidth="4" command="run {}" filename="collision.als" maxseq="4">
    <sig label="seq/Int" ID="0" parentID="1" builtin="yes"></sig>
    <sig label="Int" ID="1" parentID="2" builtin="yes"></sig>
    <sig label="univ" ID="2" builtin="yes"></sig>
    <sig label="Bar" ID="3" parentID="2">
      <atom label="Foo0"/>
    </sig>
    <sig label="Foo0" ID="4" parentID="2"></sig>
  </instance>
</alloy>`;

        const instance = new AlloyInstance(xml);
        const atom = instance.atom('Foo0');
        const signature = instance.signature('Foo0');

        expect(atom).not.toBeNull();
        expect(signature).not.toBeNull();
        expect(Reflect.get(atom!, '__var__')).toBe('Foo0');
        expect(Reflect.get(signature!, '__var__')).toBe('Foo0$sig');
    });
});
