import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  LockKeyhole,
  Send,
  ShieldAlert,
  Stethoscope,
  Target,
  User,
  Users,
  X,
} from 'lucide-react';

const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycbyqDB2OY7_EIsGfyYyE596Q3XfFXbvoF3cX2OQ94-3BkEGAhkJGOY8s2TQpg6VqGKoY/exec';
const BLACKBOARD_CODE = '4631';
const STORAGE_KEY = 'msft-acute-mh-care-plan-v1';

const domainFields = {
  currentConcern: '',
  plannedActions: '',
  patientInvolvement: '',
  responsible: '',
  frequency: '',
};

const DOMAINS = [
  { key: 'selfHarmSuicide', label: 'Risk of self-harm or suicide' },
  { key: 'riskToOthers', label: 'Risk to others / aggression' },
  { key: 'observationEngagement', label: 'Observation and engagement' },
  { key: 'mentalState', label: 'Mental state / current presentation' },
  { key: 'medication', label: 'Medication and concordance' },
  { key: 'physicalHealth', label: 'Physical health and wellbeing' },
  { key: 'leaveAbsconding', label: 'Leave, absconding and vulnerability' },
  { key: 'socialSafeguarding', label: 'Social, family and safeguarding needs' },
  { key: 'therapeuticActivity', label: 'Therapeutic activity and recovery' },
  { key: 'dischargeRelapse', label: 'Discharge and relapse prevention' },
];

const blankDomains = DOMAINS.reduce((acc, domain) => {
  acc[domain.key] = { ...domainFields };
  return acc;
}, {});

const blankState = {
  patientName: '',
  preferredName: '',
  dateOfBirth: '',
  nhsNumber: '',
  hospitalNumber: '',
  wardBedSpace: '',
  admissionDate: '',
  legalStatus: '',
  consultantNamedNurse: '',
  workingFormulation: '',
  reasonForAdmission: '',
  currentPresentation: '',
  summaryOfNeeds: '',
  collaborativeGoals: '',
  domains: blankDomains,
  risksAndConsiderations: '',
  involvement: '',
  reviewDate: '',
  nurseName: '',
};

const patientFields = [
  ['patientName', 'Patient name'],
  ['preferredName', 'Preferred name'],
  ['dateOfBirth', 'Date of birth'],
  ['nhsNumber', 'NHS number'],
  ['hospitalNumber', 'Hospital number'],
  ['wardBedSpace', 'Ward / bed space'],
  ['admissionDate', 'Admission date'],
  ['legalStatus', 'Legal status'],
  ['consultantNamedNurse', 'Consultant / named nurse'],
  ['workingFormulation', 'Main diagnosis / working formulation'],
];

function wordCount(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isFilled(value) {
  return String(value || '').trim().length > 0;
}

function getInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return blankState;
    const parsed = JSON.parse(saved);
    return {
      ...blankState,
      ...parsed,
      domains: {
        ...blankDomains,
        ...(parsed.domains || {}),
      },
    };
  } catch {
    return blankState;
  }
}

function validateForm(form) {
  const missing = [];

  patientFields.forEach(([key, label]) => {
    if (!isFilled(form[key])) missing.push(`${label} is required.`);
  });

  if (wordCount(form.reasonForAdmission) < 20) {
    missing.push('Reason for admission needs more information and clinical detail.');
  }

  if (wordCount(form.currentPresentation) < 30) {
    missing.push('Current presentation needs more detail about mental state, behaviour, risk and immediate needs.');
  }

  if (wordCount(form.summaryOfNeeds) < 30) {
    missing.push('Summary of mental health needs needs more information so the care plan is clinically useful.');
  }

  if (wordCount(form.collaborativeGoals) < 30) {
    missing.push('Collaborative goals need more detail so they are meaningful, person-centred and recovery-focused.');
  }

  DOMAINS.forEach((domain) => {
    const row = form.domains[domain.key] || domainFields;

    if (wordCount(row.currentConcern) < 10) {
      missing.push(`${domain.label}: add more detail to the current concern.`);
    }

    if (wordCount(row.plannedActions) < 10) {
      missing.push(`${domain.label}: add more detail to the planned nursing actions.`);
    }

    if (wordCount(row.patientInvolvement) < 5) {
      missing.push(`${domain.label}: add more detail about patient involvement or preferences.`);
    }

    if (!isFilled(row.responsible)) {
      missing.push(`${domain.label}: add who is responsible.`);
    }

    if (!isFilled(row.frequency)) {
      missing.push(`${domain.label}: add the frequency / when.`);
    }
  });

  if (wordCount(form.risksAndConsiderations) < 20) {
    missing.push('Overall risk and considerations needs more information about risks, protective factors and management.');
  }

  if (wordCount(form.involvement) < 5) {
    missing.push('Patient / carer involvement needs more detail.');
  }

  if (!isFilled(form.reviewDate)) missing.push('Review date is required.');
  if (!isFilled(form.nurseName)) missing.push('Nurse’s name is required.');

  return missing;
}

function App() {
  const [form, setForm] = useState(getInitialState);
  const [modal, setModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const completion = useMemo(() => {
    const values = [
      ...patientFields.map(([key]) => form[key]),
      form.reasonForAdmission,
      form.currentPresentation,
      form.summaryOfNeeds,
      form.collaborativeGoals,
      ...DOMAINS.flatMap((domain) => Object.values(form.domains[domain.key] || {})),
      form.risksAndConsiderations,
      form.involvement,
      form.reviewDate,
      form.nurseName,
    ];
    const filled = values.filter((value) => String(value || '').trim().length > 0).length;
    return Math.round((filled / values.length) * 100);
  }, [form]);

  const updateField = (field, value) => {
    setSubmitMessage('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateDomain = (domainKey, field, value) => {
    setSubmitMessage('');
    setForm((current) => ({
      ...current,
      domains: {
        ...current.domains,
        [domainKey]: {
          ...(current.domains[domainKey] || domainFields),
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitMessage('');

    const issues = validateForm(form);
    if (issues.length) {
      setModal({ type: 'validation', issues });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        blackboardCode: BLACKBOARD_CODE,
      };

      await fetch(SUBMIT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      setForm(blankState);
      localStorage.removeItem(STORAGE_KEY);
      setModal({ type: 'success' });
    } catch (error) {
      setSubmitMessage('Something went wrong and the care plan could not be submitted. Please check the connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <form className="care-plan-card" onSubmit={handleSubmit}>
        <header className="document-header">
          <div className="logo-panel">
            <img src="./msft-logo.png" alt="Mary Seacole Foundation Trust logo" />
          </div>
          <div className="title-panel">
            <HeartPulse className="title-icon" size={54} />
            <p className="eyebrow">Acute mental health ward</p>
            <h1>Care Plan</h1>
            <p className="toolbar-note">
              Complete each domain carefully. This care plan may be used as the active care plan for this patient during your 5x5 day.
            </p>
            <p className="completion">Completion: {completion}%</p>
          </div>
        </header>

        <section>
          <div className="section-title">
            <span className="section-number">1</span>
            <span className="section-icon"><User size={18} /></span>
            <h2>Patient and admission details</h2>
          </div>
          <div className="details-grid mh-details-grid">
            {patientFields.map(([key, label]) => (
              <label className={key === 'workingFormulation' ? 'field wide' : 'field'} key={key}>
                <span>{label}</span>
                <input
                  type={key.includes('Date') || key === 'dateOfBirth' || key === 'admissionDate' ? 'date' : 'text'}
                  value={form[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <div className="section-title compact-title">
              <span className="section-icon"><FileText size={18} /></span>
              <h2>Reason for admission</h2>
            </div>
            <textarea
              value={form.reasonForAdmission}
              onChange={(event) => updateField('reasonForAdmission', event.target.value)}
              placeholder="Briefly explain why the patient has been admitted to the acute mental health ward at this point in time."
            />
          </div>
          <div className="panel">
            <div className="section-title compact-title">
              <span className="section-icon"><Stethoscope size={18} /></span>
              <h2>Current presentation</h2>
            </div>
            <textarea
              value={form.currentPresentation}
              onChange={(event) => updateField('currentPresentation', event.target.value)}
              placeholder="Comment on current mental state, behaviour, engagement, risk, protective factors and immediate ward-based needs."
            />
          </div>
        </section>

        <section className="two-column">
          <div className="panel">
            <div className="section-title compact-title">
              <span className="section-icon"><ClipboardList size={18} /></span>
              <h2>Summary of mental health needs</h2>
            </div>
            <textarea
              value={form.summaryOfNeeds}
              onChange={(event) => updateField('summaryOfNeeds', event.target.value)}
              placeholder="Summarise the main mental health, safety, physical health and social needs that should guide the care plan."
            />
          </div>
          <div className="panel">
            <div className="section-title compact-title">
              <span className="section-icon"><Target size={18} /></span>
              <h2>Collaborative goals</h2>
            </div>
            <textarea
              value={form.collaborativeGoals}
              onChange={(event) => updateField('collaborativeGoals', event.target.value)}
              placeholder="Set goals that reflect both patient priorities and clinically important ward-based outcomes."
            />
          </div>
        </section>

        <section>
          <div className="section-title">
            <span className="section-number">2</span>
            <span className="section-icon"><ShieldAlert size={18} /></span>
            <h2>Acute mental health care plan domains</h2>
          </div>
          <p className="section-intro">
            Each domain must be completed. Write the plan as if another nurse could safely use it to support this patient on the ward.
          </p>
          <div className="table-wrap domain-table-wrap">
            <table className="domain-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Current concern</th>
                  <th>Planned nursing actions</th>
                  <th>Patient involvement / preferences</th>
                  <th>Who is responsible?</th>
                  <th>Frequency / when</th>
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map((domain) => {
                  const row = form.domains[domain.key] || domainFields;
                  return (
                    <tr key={domain.key}>
                      <th>{domain.label}</th>
                      <td>
                        <textarea
                          className="table-textarea"
                          value={row.currentConcern}
                          onChange={(event) => updateDomain(domain.key, 'currentConcern', event.target.value)}
                          aria-label={`${domain.label} current concern`}
                        />
                      </td>
                      <td>
                        <textarea
                          className="table-textarea"
                          value={row.plannedActions}
                          onChange={(event) => updateDomain(domain.key, 'plannedActions', event.target.value)}
                          aria-label={`${domain.label} planned nursing actions`}
                        />
                      </td>
                      <td>
                        <textarea
                          className="table-textarea"
                          value={row.patientInvolvement}
                          onChange={(event) => updateDomain(domain.key, 'patientInvolvement', event.target.value)}
                          aria-label={`${domain.label} patient involvement or preferences`}
                        />
                      </td>
                      <td>
                        <input
                          value={row.responsible}
                          onChange={(event) => updateDomain(domain.key, 'responsible', event.target.value)}
                          aria-label={`${domain.label} who is responsible`}
                        />
                      </td>
                      <td>
                        <input
                          value={row.frequency}
                          onChange={(event) => updateDomain(domain.key, 'frequency', event.target.value)}
                          aria-label={`${domain.label} frequency or when`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="two-column lower-panels">
          <div className="panel">
            <div className="section-title compact-title">
              <span className="section-icon"><AlertTriangle size={18} /></span>
              <h2>Overall risk and considerations</h2>
            </div>
            <textarea
              value={form.risksAndConsiderations}
              onChange={(event) => updateField('risksAndConsiderations', event.target.value)}
              placeholder="Summarise the overall risk formulation, protective factors, escalation points and any restrictions or legal considerations."
            />
          </div>
          <div className="panel">
            <div className="section-title compact-title">
              <span className="section-icon"><Users size={18} /></span>
              <h2>Patient / carer involvement</h2>
            </div>
            <textarea
              value={form.involvement}
              onChange={(event) => updateField('involvement', event.target.value)}
              placeholder="Explain how the patient has been involved, what they agree or disagree with, and whether carers/family are involved with consent."
            />
          </div>
        </section>

        <section>
          <div className="section-title">
            <span className="section-number">3</span>
            <span className="section-icon"><LockKeyhole size={18} /></span>
            <h2>Review and accountability</h2>
          </div>
          <div className="details-grid review-grid">
            <label className="field">
              <span>Review date</span>
              <input
                type="date"
                value={form.reviewDate}
                onChange={(event) => updateField('reviewDate', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Nurse’s name</span>
              <input
                type="text"
                value={form.nurseName}
                onChange={(event) => updateField('nurseName', event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="submit-panel no-print">
          <p>
            Submit this care plan once it is fully completed. You will only receive the Blackboard code after the care plan has been submitted.
          </p>
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            <Send size={18} />
            {isSubmitting ? 'Submitting...' : 'Submit care plan'}
          </button>
          {submitMessage && <p className="submit-message">{submitMessage}</p>}
        </section>
      </form>

      {modal && (
        <div className="modal-backdrop no-print" role="dialog" aria-modal="true">
          <div className="app-modal">
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close pop-up">
              <X size={20} />
            </button>

            {modal.type === 'validation' ? (
              <>
                <AlertTriangle className="warning-icon" size={42} />
                <h2>More detail is needed</h2>
                <p className="modal-reminder">
                  This care plan may be used in a 5x5 session at the end of the week, so make sure it is accurate, person-centred and clinically useful.
                </p>
                <p>Please review the following areas before submitting:</p>
                <ul>
                  {modal.issues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <CheckCircle2 className="success-icon" size={46} />
                <h2>Care plan submitted</h2>
                <p>
                  This care plan has been submitted and may be chosen as the active care plan for this patient on your 5x5 day!
                </p>
                <p className="blackboard-code">
                  For now though, here is your Blackboard code <strong>{BLACKBOARD_CODE}</strong>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
