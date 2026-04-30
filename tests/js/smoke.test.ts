describe('smoke', () => {
	it('jest and jsdom load', () => {
		expect(1 + 1).toBe(2);
		expect(document).toBeDefined();
	});
});
