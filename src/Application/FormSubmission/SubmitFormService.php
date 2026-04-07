<?php

declare(strict_types=1);

namespace AllFeedback\Application\FormSubmission;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Form\FormRepository;
use AllFeedback\Domain\FormSubmission\FormSubmission;
use AllFeedback\Domain\FormSubmission\FormSubmissionRepository;
use AllFeedback\Support\Logger;

/**
 * Class SubmitFormService
 *
 * Application service that orchestrates receiving, validating, and persisting
 * a respondent's form submission.  After a successful save it fires the
 * WordPress action hook so that add-ons (email notifications, webhooks, etc.)
 * can react without coupling into this class.
 *
 * @package AllFeedback\Application\FormSubmission
 * @since   1.0.0
 */
class SubmitFormService {

	/**
	 * @param FormRepository               $formRepository       Persistence port for Form aggregates.
	 * @param FormSubmissionRepository     $submissionRepository Persistence port for FormSubmission aggregates.
	 * @param ValidateFormSubmissionService $validator           Submission validation service.
	 * @param Logger                       $logger              Structured logger.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly FormRepository $formRepository,
		private readonly FormSubmissionRepository $submissionRepository,
		private readonly ValidateFormSubmissionService $validator,
		private readonly Logger $logger,
	) {}

	/**
	 * Process and persist a new form submission from the supplied DTO.
	 *
	 * @param FormSubmissionDTO $dto Validated, sanitised submission data.
	 * @return FormSubmission        The persisted aggregate with its generated ID.
	 * @throws NotFoundException   When the parent form does not exist.
	 * @throws ValidationException When the submission fails domain validation.
	 * @since 1.0.0
	 */
	public function execute( FormSubmissionDTO $dto ): FormSubmission {
		$form = $this->formRepository->findById( $dto->formId );

		if ( ! $form ) {
			throw NotFoundException::forResource( 'Form', $dto->formId );
		}

		$this->validator->validate( $form, $dto );

		$submission = new FormSubmission(
			id:           0,
			formId:       $dto->formId,
			answers:      $dto->answers,
			respondentId: $dto->respondentId,
			ipAddress:    $dto->ipAddress,
			userAgent:    $dto->userAgent,
		);

		$saved = $this->submissionRepository->save( $submission );

		$this->logger->info(
			'Form submission received.',
			[
				'submission_id' => $saved->getId(),
				'form_id'       => $saved->getFormId(),
				'anonymous'     => $saved->isAnonymous(),
			]
		);

		/**
		 * Action: allfeedback:submission:created
		 *
		 * Fires after a submission is successfully persisted.
		 * Add-ons hook here to send notifications, trigger webhooks, etc.
		 *
		 * @param FormSubmission $saved The persisted FormSubmission aggregate.
		 * @since 1.0.0
		 */
		do_action( 'allfeedback:submission:created', $saved );

		return $saved;
	}
}
