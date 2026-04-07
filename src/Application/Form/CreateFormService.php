<?php

declare(strict_types=1);

namespace AllFeedback\Application\Form;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Form\Form;
use AllFeedback\Domain\Form\FormField;
use AllFeedback\Domain\Form\FormRepository;
use AllFeedback\Support\Logger;

/**
 * Class CreateFormService
 *
 * Application service that orchestrates the creation of a new Form aggregate.
 * Validates the incoming DTO, builds the domain object, persists it via the
 * repository, and fires the post-create WordPress action hook.
 *
 * @package AllFeedback\Application\Form
 * @since   1.0.0
 */
class CreateFormService {

	/**
	 * @param FormRepository $repository Persistence port for Form aggregates.
	 * @param Logger         $logger     Structured logger.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly FormRepository $repository,
		private readonly Logger $logger,
	) {}

	/**
	 * Create and persist a new Form from the supplied DTO.
	 *
	 * @param FormDTO $dto Validated, sanitised form data.
	 * @return Form         The persisted aggregate with its generated ID.
	 * @throws ValidationException When DTO data violates domain rules.
	 * @since 1.0.0
	 */
	public function execute( FormDTO $dto ): Form {
		$this->validate( $dto );

		$form = new Form(
			id:          0,
			title:       $dto->title,
			description: $dto->description,
			isActive:    $dto->isActive,
		);

		foreach ( $dto->fields as $index => $fieldDTO ) {
			$form->addField(
				new FormField(
					id:          0,
					formId:      0,
					type:        $fieldDTO->type,
					label:       $fieldDTO->label,
					sortOrder:   $fieldDTO->sortOrder !== 0 ? $fieldDTO->sortOrder : $index,
					required:    $fieldDTO->required,
					placeholder: $fieldDTO->placeholder,
					choices:     $fieldDTO->choices,
					settings:    $fieldDTO->settings,
				)
			);
		}

		$saved = $this->repository->save( $form );

		$this->logger->info(
			'Form created.',
			[
				'form_id' => $saved->getId(),
				'title'   => $saved->getTitle(),
			]
		);

		/**
		 * Action: allfeedback:form:created
		 *
		 * Fires immediately after a new form is persisted.
		 *
		 * @param Form $saved The newly created Form aggregate.
		 * @since 1.0.0
		 */
		do_action( 'allfeedback:form:created', $saved );

		return $saved;
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	/**
	 * Assert that the DTO satisfies domain creation rules.
	 *
	 * @param FormDTO $dto
	 * @throws ValidationException
	 * @since 1.0.0
	 */
	private function validate( FormDTO $dto ): void {
		$errors = [];

		if ( trim( $dto->title ) === '' ) {
			$errors['title'][] = __( 'The form title is required.', 'all-feedback' );
		}

		if ( mb_strlen( $dto->title ) > 200 ) {
			$errors['title'][] = __( 'The form title must not exceed 200 characters.', 'all-feedback' );
		}

		if ( ! empty( $errors ) ) {
			throw ValidationException::withErrors( $errors );
		}
	}
}
