// Copyright (c) 2019, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Data Import Beta', {
	refresh(frm) {
		frm.page.hide_icon_group();
		frm.trigger('import_file');
		frm.trigger('reference_doctype');
		frm.trigger('show_import_log');
		if (!frm.is_new()) {
			frm.page.set_primary_action(__('Start Import'), () =>
				frm.events.start_import(frm)
			);
		} else {
			frm.page.set_primary_action(__('Save'), () => frm.save());
		}
	},

	start_import(frm) {
		let csv_array = frm.import_preview.get_rows_as_csv_array();
		let template_options = JSON.parse(frm.doc.template_options || '{}');
		template_options.edited_rows = csv_array;
		frm.set_value('template_options', JSON.stringify(template_options));

		frm.save().then(() => {
			frm.trigger('import_file').then(() =>
				frm.call('start_import').then(r => {
					let warnings = r.message || [];
					if (warnings.length) {
						frm.import_preview.render_warnings(warnings);
					} else {
						//
					}
				})
			);
		});
	},

	download_sample_file(frm) {
		frappe.require('/assets/js/data_import_tools.min.js', () => {
			new frappe.data_import.DataExporter(frm.doc.reference_doctype);
		});
	},

	import_file(frm) {
		if (frm.doc.import_file) {
			$('<span class="text-muted">')
				.html(__('Loading import file...'))
				.appendTo(frm.get_field('import_preview').$wrapper);

			frm
				.call({
					doc: frm.doc,
					method: 'get_preview_from_template',
					freeze: true,
					freeze_message: __('Preparing Preview...')
				})
				.then(r => {
					let preview_data = r.message;
					frm.events.show_import_preview(frm, preview_data);
				});
		} else {
			frm.get_field('import_preview').$wrapper.empty();
		}
		frm.toggle_display('section_import_preview', frm.doc.import_file);
	},

	show_import_preview(frm, preview_data) {
		frappe.require('/assets/js/data_import_tools.min.js', () => {
			frm.import_preview = new frappe.data_import.ImportPreview({
				wrapper: frm.get_field('import_preview').$wrapper,
				doctype: frm.doc.reference_doctype,
				preview_data,
				events: {
					remap_column(header_row_index, fieldname) {
						let template_options = JSON.parse(frm.doc.template_options || '{}');
						template_options.remap_column = template_options.remap_column || {};
						template_options.remap_column[header_row_index] = fieldname;
						// if the column is remapped, remove it from skip_import
						if (
							template_options.skip_import &&
							template_options.skip_import.includes(header_row_index)
						) {
							template_options.skip_import = template_options.skip_import.filter(
								d => d !== header_row_index
							);
						}
						frm.set_value('template_options', JSON.stringify(template_options));
						frm.save().then(() => {
							frm.trigger('import_file');
						});
					},

					skip_import(header_row_index) {
						let template_options = JSON.parse(frm.doc.template_options || '{}');
						template_options.skip_import = template_options.skip_import || [];
						if (!template_options.skip_import.includes(header_row_index)) {
							template_options.skip_import.push(header_row_index);
						}
						// if column is being skipped, remove it from remap_column
						if (
							template_options.remap_column &&
							template_options.remap_column[header_row_index]
						) {
							delete template_options.remap_column[header_row_index];
						}
						frm.set_value('template_options', JSON.stringify(template_options));
						frm.save().then(() => {
							frm.trigger('import_file');
						});
					}
				}
			});
		});
	},

	show_import_log(frm) {
		frm.toggle_display('import_log', false);
		if (!frm.doc.import_log) {
			frm.get_field('import_log_preview').$wrapper.empty();
			return;
		}
		let import_log = JSON.parse(frm.doc.import_log);
		let rows = import_log
			.map(log => {
				return `<tr>
					<td>${log.name}</td>
					<td>${log.inserted ? 'Inserted' : ''}</td>
				</tr>`;
			})
			.join('');
		frm.get_field('import_log_preview').$wrapper.html(`
			<table class="table table-bordered">
				<tr>
					<th width="30%">${__('Document Name')}</th>
					<th width="70%">${__('Status')}</th>
				</tr>
				${rows}
			</table>
		`);
	}
});
