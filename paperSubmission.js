/**
 * =============================================
 * SITE-EMAR 2026 Conference Management System
 * Paper Submission Module
 * =============================================
 */

// =============================================
// 1. PAPER SUBMISSION
// =============================================

/**
 * Upload paper with metadata
 * @param {File} file - Paper file
 * @param {Object} metadata - Paper metadata
 * @returns {Promise<Object>} Result object
 */
async function uploadPaper(file, metadata) {
    try {
        console.log('📤 Uploading paper...', metadata);

        // 1. Get current authenticated user
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Please log in to submit a paper');
        }

        // 2. Get user details from database
        const userRecord = await auth.getCurrentUserRecord();
        if (!userRecord) {
            throw new Error('User record not found. Please complete registration first.');
        }

        // 3. Validate file
        if (!utils.isValidFileType(file.name, ['.pdf', '.doc', '.docx'])) {
            throw new Error('Invalid file type. Please upload PDF, DOC, or DOCX files only.');
        }

        if (!utils.isValidFileSize(file.size, 10)) {
            throw new Error('File size exceeds 10 MB limit');
        }

        // 4. Upload file to storage
        const fileName = `${userRecord.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('papers')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        console.log('✅ File uploaded to storage:', uploadData.path);

        // 5. Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('papers')
            .getPublicUrl(fileName);

        // 6. Create paper record in database
        const { data: paperData, error: paperError } = await supabaseClient
            .from('papers')
            .insert([{
                user_id: userRecord.id,
                user_name: userRecord.full_name,
                user_email: userRecord.email,
                paper_title: metadata.title || '',
                abstract: metadata.abstract || '',
                keywords: metadata.keywords || [],
                file_name: file.name,
                file_url: fileName, // Store path, not URL
                file_size_bytes: file.size,
                status: 'pending'
            }])
            .select()
            .single();

        if (paperError) throw paperError;

        console.log('✅ Paper record created:', paperData);

        // 7. Send confirmation email to user (Disabled per user request)
        // await sendPaperSubmissionConfirmation(userRecord, paperData);

        // 8. Send notification to admin (Disabled - Admin initiates emails)
        // await sendAdminPaperNotification(userRecord, paperData);

        return { success: true, data: paperData };

    } catch (error) {
        console.error('❌ Paper upload error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get user's submitted papers
 * @returns {Promise<Array>} Array of paper objects
 */
async function getUserPapers() {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        const userRecord = await auth.getCurrentUserRecord();
        if (!userRecord) return [];

        const { data, error } = await supabaseClient
            .from('papers')
            .select('*')
            .eq('user_id', userRecord.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];

    } catch (error) {
        console.error('Error fetching papers:', error.message);
        return [];
    }
}

/**
 * Delete paper submission
 * @param {string} paperId - Paper ID
 * @returns {Promise<Object>} Result object
 */
async function deletePaper(paperId) {
    try {
        // Get paper details first
        const { data: paper, error: fetchError } = await supabaseClient
            .from('papers')
            .select('*')
            .eq('id', paperId)
            .single();

        if (fetchError) throw fetchError;

        // Only allow deletion if status is pending
        if (paper.status !== 'pending') {
            throw new Error('Cannot delete paper that is under review or has been reviewed');
        }

        // Delete file from storage
        const { error: storageError } = await supabaseClient.storage
            .from('papers')
            .remove([paper.file_url]);

        if (storageError) {
            console.warn('Warning: Could not delete file from storage:', storageError.message);
        }

        // Delete database record
        const { error: deleteError } = await supabaseClient
            .from('papers')
            .delete()
            .eq('id', paperId);

        if (deleteError) throw deleteError;

        console.log('✅ Paper deleted successfully');
        return { success: true };

    } catch (error) {
        console.error('❌ Error deleting paper:', error.message);
        return { success: false, error: error.message };
    }
}

// =============================================
// 2. EMAIL NOTIFICATIONS
// =============================================

/**
 * Send paper submission confirmation to user
 * @param {Object} userRecord - User record
 * @param {Object} paperData - Paper data
 */
async function sendPaperSubmissionConfirmation(userRecord, paperData) {
    try {
        const emailBody = `Dear ${userRecord.title} ${userRecord.full_name},

Your paper has been successfully submitted to SITE-EMAR 2026!

Paper Details:
- Title: ${paperData.paper_title}
- Submission ID: ${paperData.id}
- Submission Date: ${utils.formatDateTime(paperData.created_at)}
- File Size: ${utils.formatFileSize(paperData.file_size_bytes)}

Your paper is now under review. You will be notified once the review process is complete.

You can track the status of your submission by logging into your account at:
${window.location.origin}/papersubmission.html

For any queries, please contact us at: ${window.utils.ADMIN_EMAIL}

Best regards,
SITE-EMAR 2026 Organizing Committee`;

        await sendUserNotification(userRecord.email, {
            recipientName: userRecord.full_name,
            type: 'paper_submission_confirmation',
            subject: 'Paper Submission Received - SITE-EMAR 2026',
            body: emailBody
        });

    } catch (error) {
        console.error('Error sending submission confirmation:', error);
    }
}

/**
 * Send paper submission notification to admin
 * @param {Object} userRecord - User record
 * @param {Object} paperData - Paper data
 */
async function sendAdminPaperNotification(userRecord, paperData) {
    try {
        const emailBody = `New paper submission received:

Submitted By: ${userRecord.title} ${userRecord.full_name}
Email: ${userRecord.email}
Phone: ${userRecord.phone}
Affiliation: ${userRecord.affiliation}

Paper Details:
- Title: ${paperData.paper_title}
- Submission ID: ${paperData.id}
- File Name: ${paperData.file_name}
- File Size: ${utils.formatFileSize(paperData.file_size_bytes)}
- Submission Date: ${utils.formatDateTime(paperData.created_at)}

Abstract:
${paperData.abstract}

Please review this submission in the admin dashboard:
${window.location.origin}/admin.html

---
This is an automated notification from SITE-EMAR 2026 Conference Management System.`;

        await sendAdminNotification({
            type: 'new_paper_submission',
            subject: 'New Paper Submission - SITE-EMAR 2026',
            body: emailBody
        });

    } catch (error) {
        console.error('Error sending admin notification:', error);
    }
}

// =============================================
// 3. UI FUNCTIONS
// =============================================

/**
 * Display user's papers in a table
 */
async function displayUserPapers() {
    const papersContainer = document.getElementById('userPapersContainer');
    if (!papersContainer) return;

    utils.showLoading(papersContainer);

    try {
        const papers = await getUserPapers();

        if (papers.length === 0) {
            papersContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    You haven't submitted any papers yet. Use the form above to submit your first paper.
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Submission Date</th>
                            <th>Status</th>
                            <th>File Size</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        papers.forEach(paper => {
            html += `
                <tr>
                    <td>
                        <strong>${paper.paper_title || 'Untitled'}</strong>
                        <br><small class="text-muted">${paper.file_name}</small>
                    </td>
                    <td>${utils.formatDateTime(paper.created_at)}</td>
                    <td>${utils.getStatusBadge(paper.status)}</td>
                    <td>${utils.formatFileSize(paper.file_size_bytes)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewPaper('${paper.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${paper.status === 'pending' ? `
                            <button class="btn btn-sm btn-danger" onclick="handleDeletePaper('${paper.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;

            if (paper.review_comments) {
                html += `
                    <tr>
                        <td colspan="5" class="bg-light">
                            <strong>Review Comments:</strong> ${paper.review_comments}
                            ${paper.reviewer_name ? `<br><small>Reviewed by: ${paper.reviewer_name}</small>` : ''}
                        </td>
                    </tr>
                `;
            }
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        papersContainer.innerHTML = html;

    } catch (error) {
        utils.showError('Error loading papers');
        papersContainer.innerHTML = `
            <div class="alert alert-danger">
                Error loading papers. Please try again.
            </div>
        `;
    }
}

/**
 * View paper details
 * @param {string} paperId - Paper ID
 */
async function viewPaper(paperId) {
    // Implementation depends on your UI design
    utils.showInfo('Paper viewing functionality - to be implemented');
}

/**
 * Handle paper deletion with confirmation
 * @param {string} paperId - Paper ID
 */
async function handleDeletePaper(paperId) {
    if (!utils.confirmAction('Are you sure you want to delete this paper? This action cannot be undone.')) {
        return;
    }

    const result = await deletePaper(paperId);

    if (result.success) {
        utils.showSuccess('Paper deleted successfully');
        await displayUserPapers(); // Refresh list
    } else {
        utils.showError(result.error || 'Failed to delete paper');
    }
}

// =============================================
// 4. FORM INITIALIZATION
// =============================================

/**
 * Initialize paper submission form
 */
function initPaperSubmissionForm() {
    const paperForm = document.getElementById('paperSubmissionForm');
    if (!paperForm) return;

    paperForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const fileInput = document.getElementById('paperFile');
        const title = document.getElementById('paperTitle')?.value;
        const abstract = document.getElementById('paperAbstract')?.value;
        const keywords = document.getElementById('paperKeywords')?.value;

        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
            utils.showError('Please select a file to upload');
            return;
        }

        const file = fileInput.files[0];

        // Validate
        if (!title) {
            utils.showError('Please enter a paper title');
            return;
        }

        // Prepare metadata
        const metadata = {
            title: title,
            abstract: abstract || '',
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : []
        };

        // Disable submit button
        const submitBtn = paperForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading...';
        }

        try {
            const result = await uploadPaper(file, metadata);

            if (result.success) {
                utils.showSuccess('Paper submitted successfully!');
                paperForm.reset();

                // Refresh papers list
                await displayUserPapers();
            } else {
                utils.showError(result.error || 'Paper submission failed');
            }

        } catch (error) {
            utils.showError('An unexpected error occurred');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Submit Paper';
            }
        }
    });

    // File input change handler
    const fileInput = document.getElementById('paperFile');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const fileInfo = document.getElementById('fileInfo');
                if (fileInfo) {
                    fileInfo.innerHTML = `
                        <small class="text-muted">
                            Selected: ${file.name} (${utils.formatFileSize(file.size)})
                        </small>
                    `;
                }

                // Validate file
                if (!utils.isValidFileType(file.name)) {
                    utils.showError('Invalid file type. Please upload PDF, DOC, or DOCX files only.');
                    fileInput.value = '';
                }

                if (!utils.isValidFileSize(file.size, 10)) {
                    utils.showError('File size exceeds 10 MB limit');
                    fileInput.value = '';
                }
            }
        });
    }
}

// =============================================
// 5. AUTO-INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Paper submission module initialized');

    // Require authentication
    const isAuthenticated = await auth.requireAuth();
    if (!isAuthenticated) return;

    initPaperSubmissionForm();
    displayUserPapers();
});

// =============================================
// 6. EXPORTS
// =============================================

window.paperSubmission = {
    uploadPaper,
    getUserPapers,
    deletePaper,
    displayUserPapers,
    viewPaper,
    handleDeletePaper,
    initPaperSubmissionForm
};

// Make functions globally available for onclick handlers
window.viewPaper = viewPaper;
window.handleDeletePaper = handleDeletePaper;

console.log('📄 Paper submission library loaded');