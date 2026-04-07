<?php

declare(strict_types=1);

namespace AllFeedback\Application\Form;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Form\Form;
use AllFeedback\Domain\Form\FormField;
use AllFeedback\Domain\Form\FormRepository;
use AllFeedback\Support\Logger;

/**
 * Class UpdateFormService
 *
 * Application service that applies a partial or full update to an existing
 * Form aggregate.  Only the keys present in the DTO are applied — absent
 * keys leave the existing aggregate state unchanged.
 *
 * @package AllFeedback\Application\Form
 * @since   1.0.0
 */
class UpdateFormService {

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
	 * Apply the DTO updates to the given form aggregate and persist the result.
	 *
	 * @param int                  $formId   The form to update.
	 * @param array<string, mixed> $body     Raw JSON body (pre-parsed, not yet applied).
	 * @param FormDTO              $dto      Sanitised and partially-filled DTO.
	 * @return Form                          The saved aggregate.
	 * @throws NotFoundException  When no form with $formId exists.
	 * @throws ValidationException When updated data violates domain rules.
	 * @since 1.0.0
	 */
	public function execute( int $formId, array $body, FormDTO $dto ): Form {
		$form = $this->repository->findById( $formId );

		if ( ! $form ) {
			throw NotFoundException::forResource( 'Form', $formId );
		}

		$this->applyUpdates( $form, $body, $dto );
		$this->validate( $form );

		$saved = $this->repository->save( $form );

		$this->logger->info(
			'Form updated.',
			[
				'form_id' => $saved->getId(),
				'title'   => $saved->getTitle(),
			]
		);

		/**
		 * Action: allfeedback:form:updated
		 *
		 * Fires immediately after a form is updated and persisted.
		 *
		 * @param Form $saved The updated Form aggregate.
		 * @since 1.0.0
		 */
		do_action( 'allfeedback:form:updated', $saved );

		return $saved;
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	/**
	 * Apply only the attributes present in $body to the aggregate.
	 *
	 * @param Form                 $form
	 * @param array<string, mixed> $body Raw JSON body keys (used to detect presence).
	 * @param FormDTO              $dto  Sanitised values.
	 * @since 1.0.0
	 */
	private function applyUpdates( Form $form, array $body, FormDTO $dto ): void {
		if ( array_key_exists( 'title', $body ) ) {
			$form->setTitle( $dto->title );
		}

		if ( array_key_exists( 'description', $body ) ) {
			$form->setDescription( $dto->description );
		}

		if ( array_key_exists( 'is_active', $body ) ) {
			$dto->isActive ? $form->activate() : $form->deactivate();
		}

		if ( array_key_exists( 'fields', $body ) ) {
			$fields = [];
			foreach ( $dto->fields as $index => $fieldDTO ) {
				$fields[] = new FormField(
					id:          0,
					formId:      $form->getId(),
					type:        $fieldDTO->type,
					label:       $fieldDTO->label,
					sortOrder:   $fieldDTO->sortOrder !== 0 ? $fieldDTO->sortOrder : $index,
					required:    $fieldDTO->required,
					placeholder: $fieldDTO->placeholder,
					choices:     $fieldDTO->choices,
					settings:    $fieldDTO->settings,
				);
			}
			$form->setFields( $fields );
		}
	}

	/**
	 * Assert that the aggregate state after updates satisfies domain rules.
	 *
	 * @param Form $form
	 * @throws ValidationException
	 * @since 1.0.0
	 */
	private function validate( Form $form ): void {
		$errors = [];

		if ( trim( $form->getTitle() ) === '' ) {
			$errors['title'][] = __( 'The form title is required.', 'all-feedback' );
		}

		if ( mb_strlen( $form->getTitle() ) > 200 ) {
			$errors['title'][] = __( 'The form title must not exceed 200 characters.', 'all-feedback' );
		}

		if ( ! empty( $errors ) ) {
			throw ValidationException::withErrors( $errors );
		}
	}
}
